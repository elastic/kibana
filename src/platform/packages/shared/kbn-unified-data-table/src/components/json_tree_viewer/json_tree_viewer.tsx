/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTreeView,
  type EuiTreeViewProps,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = Record<string, unknown> | unknown[] | JsonPrimitive | undefined;

export interface JsonTreeViewerProps {
  json: JsonValue;
}

const MIN_VISIBLE_ITEMS = 5;
const INITIAL_VISIBLE_ITEMS = 10;
const VISIBLE_ITEMS_INCREMENT = 10;

type TreeItem = EuiTreeViewProps['items'][number];
type ExpansionState = Record<string, boolean>;

const isJsonObject = (value: JsonValue): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizePrimitive = (value: JsonValue): JsonPrimitive => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
};

const getItemId = (path: string[]) => `json-tree-${path.join('__')}`;

const getExpandableItemIds = (items: TreeItem[]): string[] =>
  items.flatMap((item) => (item.children ? [item.id, ...getExpandableItemIds(item.children)] : []));

const applyExpansionState = (items: TreeItem[], state: ExpansionState): TreeItem[] =>
  items.map((item): TreeItem => {
    if (!item.children) return item;
    return {
      ...item,
      children: applyExpansionState(item.children, state),
      isExpanded: state[item.id] ?? false,
    };
  });

// ---- Sub-components for tree node labels ----

const primitiveValueStyles = {
  null: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, whiteSpace: 'nowrap' }),
  string: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textDanger, whiteSpace: 'nowrap' }),
  other: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSuccess, whiteSpace: 'nowrap' }),
};

const PrimitiveValue = memo(function PrimitiveValue({ value }: { value: JsonPrimitive }) {
  const styles = useMemoCss(primitiveValueStyles);
  const style =
    value === null ? styles.null : typeof value === 'string' ? styles.string : styles.other;
  const text = value === null ? 'null' : typeof value === 'string' ? `"${value}"` : String(value);
  return <span css={style}>{text}</span>;
});

const nodeLabelStyles = {
  root: ({ euiTheme }: UseEuiTheme) =>
    css({
      alignItems: 'center',
      display: 'inline-flex',
      gap: euiTheme.size.xxs,
      fontFamily: euiTheme.font.familyCode,
      fontSize: euiTheme.size.m,
      lineHeight: euiTheme.size.m,
      minWidth: 0,
    }),
  punctuation: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textSubdued }),
  key: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
  bracket: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
};

const CollectionLabel = memo(function CollectionLabel({
  name,
  count,
  collectionType,
}: {
  name: string;
  count: number;
  collectionType: 'object' | 'array';
}) {
  const styles = useMemoCss(nodeLabelStyles);
  const openBracket = collectionType === 'array' ? '[' : '{';
  const itemsWord = collectionType === 'array' ? 'items' : 'fields';
  return (
    <span title={`${count} ${itemsWord}`} css={styles.root}>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.key}>{name}</span>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.punctuation}>:</span>
      <span css={styles.bracket}>{openBracket}</span>
    </span>
  );
});

const LeafLabel = memo(function LeafLabel({ name, value }: { name: string; value: JsonPrimitive }) {
  const styles = useMemoCss(nodeLabelStyles);
  return (
    <span css={styles.root}>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.key}>{name}</span>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.punctuation}>:</span>
      <PrimitiveValue value={value} />
      <span css={styles.punctuation}>,</span>
    </span>
  );
});

// ---- Tree item builders (pure functions) ----

function buildTreeItem({
  name,
  path,
  value,
}: {
  name: string;
  path: string[];
  value: JsonValue;
}): TreeItem {
  if (Array.isArray(value)) {
    return {
      id: getItemId(path),
      label: <CollectionLabel name={name} count={value.length} collectionType="array" />,
      children: value.map((childValue, index) =>
        buildTreeItem({
          name: String(index),
          path: [...path, String(index)],
          value: childValue as JsonValue,
        })
      ),
    };
  }

  if (isJsonObject(value)) {
    const entries = Object.entries(value);
    return {
      id: getItemId(path),
      label: <CollectionLabel name={name} count={entries.length} collectionType="object" />,
      children: entries.map(([childName, childValue]) =>
        buildTreeItem({
          name: childName,
          path: [...path, childName],
          value: childValue as JsonValue,
        })
      ),
    };
  }

  return {
    id: getItemId(path),
    label: <LeafLabel name={name} value={normalizePrimitive(value)} />,
  };
}

function buildTreeItems(json: JsonValue): TreeItem[] {
  if (Array.isArray(json)) {
    return json.map((value, index) =>
      buildTreeItem({ name: String(index), path: [String(index)], value: value as JsonValue })
    );
  }

  if (isJsonObject(json)) {
    return Object.entries(json).map(([name, value]) =>
      buildTreeItem({ name, path: [name], value: value as JsonValue })
    );
  }

  return [buildTreeItem({ name: 'value', path: ['value'], value: json })];
}

// ---- Main component styles ----

const componentStyles = {
  treeWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontFamily: euiTheme.font.familyCode,
      fontSize: euiTheme.size.m,
      lineHeight: euiTheme.size.m,
      '.euiTreeView__node': {
        marginBottom: 0,
      },
    }),
};

// ---- Main component ----

export const JsonTreeViewer = memo(function JsonTreeViewer({ json }: JsonTreeViewerProps) {
  const styles = useMemoCss(componentStyles);

  const allItems = useMemo(() => buildTreeItems(json), [json]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [expansionState, setExpansionState] = useState<ExpansionState>({});
  const [treeKey, setTreeKey] = useState(0);

  const visibleSlice = useMemo(
    () => allItems.slice(0, Math.min(visibleCount, allItems.length)),
    [allItems, visibleCount]
  );

  const visibleItems = useMemo(
    () => applyExpansionState(visibleSlice, expansionState),
    [visibleSlice, expansionState]
  );

  const hiddenCount = allItems.length - visibleSlice.length;
  const canHide = visibleSlice.length > Math.min(MIN_VISIBLE_ITEMS, allItems.length);

  const expandVisible = useCallback(() => {
    const expandableIds = getExpandableItemIds(visibleSlice);
    setExpansionState((prev) => ({
      ...prev,
      ...Object.fromEntries(expandableIds.map((id) => [id, true])),
    }));
    setTreeKey((prev) => prev + 1);
  }, [visibleSlice]);

  const collapseVisible = useCallback(() => {
    const expandableIds = getExpandableItemIds(visibleSlice);
    setExpansionState((prev) => ({
      ...prev,
      ...Object.fromEntries(expandableIds.map((id) => [id, false])),
    }));
    setTreeKey((prev) => prev + 1);
  }, [visibleSlice]);

  const showMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + VISIBLE_ITEMS_INCREMENT, allItems.length));
  }, [allItems.length]);

  const showAll = useCallback(() => {
    setVisibleCount(allItems.length);
  }, [allItems.length]);

  const showLess = useCallback(() => {
    const minCount = Math.min(MIN_VISIBLE_ITEMS, allItems.length);
    const collapsibleIds = getExpandableItemIds(allItems.slice(0, minCount));
    setVisibleCount(minCount);
    setExpansionState((prev) => ({
      ...prev,
      ...Object.fromEntries(collapsibleIds.map((id) => [id, false])),
    }));
    setTreeKey((prev) => prev + 1);
  }, [allItems]);

  const { openBracket, closeBracket } = useMemo(() => {
    if (Array.isArray(json)) return { openBracket: '[', closeBracket: ']' };
    if (isJsonObject(json)) return { openBracket: '{', closeBracket: '}' };
    return { openBracket: null, closeBracket: null };
  }, [json]);

  const nextShowCount = Math.min(VISIBLE_ITEMS_INCREMENT, hiddenCount);
  const treeId = `jsonTreeViewer-${treeKey}`;

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="left" iconType="arrowDown" onClick={expandVisible} size="xs">
            {i18n.translate('unifiedDataTable.jsonTreeViewer.expandVisibleButtonLabel', {
              defaultMessage: 'Expand visible',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="left" iconType="arrowRight" onClick={collapseVisible} size="xs">
            {i18n.translate('unifiedDataTable.jsonTreeViewer.collapseVisibleButtonLabel', {
              defaultMessage: 'Collapse visible',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div css={styles.treeWrapper}>
        {openBracket !== null && <div>{openBracket}</div>}
        <EuiTreeView
          aria-label={i18n.translate('unifiedDataTable.jsonTreeViewer.treeAriaLabel', {
            defaultMessage: 'JSON tree view',
          })}
          display="compressed"
          id={treeId}
          items={visibleItems}
          key={treeId}
          showExpansionArrows
        />
        {closeBracket !== null && <div>{closeBracket}</div>}
      </div>
      {(canHide || hiddenCount > 0) && (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          {canHide && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty flush="left" iconType="sortUp" onClick={showLess} size="xs">
                {i18n.translate('unifiedDataTable.jsonTreeViewer.showLessButtonLabel', {
                  defaultMessage: 'Hide all rows',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {hiddenCount > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty flush="left" iconType="sortDown" onClick={showMore} size="xs">
                  {i18n.translate('unifiedDataTable.jsonTreeViewer.showMoreButtonLabel', {
                    defaultMessage:
                      'Show {count, plural, one {# more field} other {# more fields}}',
                    values: { count: nextShowCount },
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty flush="left" iconType="list" onClick={showAll} size="xs">
                  {i18n.translate('unifiedDataTable.jsonTreeViewer.showAllButtonLabel', {
                    defaultMessage: 'Show full object',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      )}
    </>
  );
});
