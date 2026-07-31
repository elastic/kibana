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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiTreeView,
  copyToClipboard,
  euiFontSize,
  type EuiTreeViewProps,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = Record<string, unknown> | unknown[] | JsonPrimitive | undefined;

export interface JsonTreeViewerProps {
  json: JsonValue;
}

const INITIAL_VISIBLE_ITEMS = 10;
const VISIBLE_ITEMS_INCREMENT = 10;

type TreeItem = EuiTreeViewProps['items'][number];
type ExpansionState = Record<string, boolean>;

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizePrimitive = (value: unknown): JsonPrimitive => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
};

const getItemId = (path: string[]) => `json-tree-${path.join('__')}`;

const getExpandableItemIds = (items: TreeItem[]): string[] =>
  items.flatMap((item) => (item.children ? [item.id, ...getExpandableItemIds(item.children)] : []));

// EuiTreeView is uncontrolled, but each node exposes a `callback` that fires on
// pointer/Enter/Space toggles. We mirror those toggles into our own expansion state so
// derived UI (e.g. the Expand/Collapse-all toggle) stays in sync without reaching into
// EUI internals. (Arrow-key toggles are deliberately excluded by EUI, so they remain
// untracked — see the note where this is used.)
const applyExpansionState = (
  items: TreeItem[],
  state: ExpansionState,
  onToggle: (id: string) => void
): TreeItem[] =>
  items.map((item): TreeItem => {
    if (!item.children) return item;
    return {
      ...item,
      children: applyExpansionState(item.children, state, onToggle),
      isExpanded: state[item.id] ?? false,
      callback: () => {
        onToggle(item.id);
        return '';
      },
    };
  });

// ---- Sub-components for tree node labels ----

// Values use the colourblind-safe visualisation palette (not the danger/success status
// tokens), and quotes/keywords carry type too so colour is never the only signal.
// Long values (log messages, URLs, stack traces) wrap instead of being clipped;
// `pre-wrap` also preserves newlines, and `anywhere` breaks unbroken strings like URLs.
const wrappingValue = { minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' } as const;

const primitiveValueStyles = {
  null: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, fontStyle: 'italic' }),
  string: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.vis.euiColorVisText1, ...wrappingValue }),
  other: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.vis.euiColorVisText2, ...wrappingValue }),
};

const PrimitiveValue = memo(function PrimitiveValue({ value }: { value: JsonPrimitive }) {
  const styles = useMemoCss(primitiveValueStyles);
  const style =
    value === null ? styles.null : typeof value === 'string' ? styles.string : styles.other;
  const text = value === null ? 'null' : typeof value === 'string' ? `"${value}"` : String(value);
  return <span css={style}>{text}</span>;
});

const nodeLabelStyles = {
  // Plain inline flow: the syntax tokens read like a line of JSON and wrap naturally
  // (the trailing comma stays attached to the value, long values break onto new lines).
  root: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
      fontFamily: euiTheme.font.familyCode,
      ...euiFontSize(euiThemeContext, 'xs'),
    });
  },
  punctuation: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textSubdued }),
  key: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
  bracket: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
  count: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textSubdued }),
  // The closing bracket is a synthetic trailing child node, so EuiTreeView indents it
  // one level too deep; pull it back so it lines up under its opening key.
  closingBracket: ({ euiTheme }: UseEuiTheme) => css({ marginInlineStart: `-${euiTheme.size.l}` }),
  // Per-value copy button: hidden until the row is hovered/focused (see treeWrapper CSS).
  copyButton: ({ euiTheme }: UseEuiTheme) =>
    css({ opacity: 0, marginInlineStart: euiTheme.size.xs, '&:focus-visible': { opacity: 1 } }),
};

const ValueCopyButton = memo(function ValueCopyButton({ value }: { value: JsonPrimitive }) {
  const styles = useMemoCss(nodeLabelStyles);
  const label = i18n.translate('unifiedDataTable.jsonTreeViewer.copyValueButtonLabel', {
    defaultMessage: 'Copy value',
  });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={label}
        className="jsonTreeCopyButton"
        color="text"
        css={styles.copyButton}
        iconSize="s"
        iconType="copy"
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          copyToClipboard(value === null ? 'null' : String(value));
        }}
        size="xs"
      />
    </EuiToolTip>
  );
});

const OPEN_BRACKET = { object: '{', array: '[' } as const;
const CLOSE_BRACKET = { object: '}', array: ']' } as const;

// Renders the `"key":` prefix. Array items are positional, so they render as bare
// values (matching JSON, where array elements have no key).
const KeyPrefix = memo(function KeyPrefix({
  name,
  isArrayItem,
}: {
  name: string;
  isArrayItem: boolean;
}) {
  const styles = useMemoCss(nodeLabelStyles);
  if (isArrayItem) return null;
  return (
    <>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.key}>{name}</span>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.punctuation}>:</span>{' '}
    </>
  );
});

const CollectionLabel = memo(function CollectionLabel({
  name,
  count,
  collectionType,
  trailingComma,
  isArrayItem,
}: {
  name: string;
  count: number;
  collectionType: 'object' | 'array';
  trailingComma: boolean;
  isArrayItem: boolean;
}) {
  const styles = useMemoCss(nodeLabelStyles);
  const itemsWord = collectionType === 'array' ? 'items' : 'fields';
  return (
    <span css={styles.root}>
      <KeyPrefix name={name} isArrayItem={isArrayItem} />
      <span css={styles.bracket}>{OPEN_BRACKET[collectionType]}</span>
      {/* Only shown while collapsed (see treeWrapper CSS) so a folded node reads as { 2 fields } */}
      <span className="jsonTreeCollapsedOnly">
        <span css={styles.count}>{`${count} ${itemsWord}`}</span>
        <span css={styles.bracket}>{CLOSE_BRACKET[collectionType]}</span>
        {trailingComma && <span css={styles.punctuation}>,</span>}
      </span>
    </span>
  );
});

const LeafLabel = memo(function LeafLabel({
  name,
  value,
  trailingComma,
  isArrayItem,
}: {
  name: string;
  value: JsonPrimitive;
  trailingComma: boolean;
  isArrayItem: boolean;
}) {
  const styles = useMemoCss(nodeLabelStyles);
  return (
    <span css={styles.root}>
      <KeyPrefix name={name} isArrayItem={isArrayItem} />
      <PrimitiveValue value={value} />
      {trailingComma && <span css={styles.punctuation}>,</span>}
      <ValueCopyButton value={value} />
    </span>
  );
});

const EmptyCollectionLabel = memo(function EmptyCollectionLabel({
  name,
  collectionType,
  trailingComma,
  isArrayItem,
}: {
  name: string;
  collectionType: 'object' | 'array';
  trailingComma: boolean;
  isArrayItem: boolean;
}) {
  const styles = useMemoCss(nodeLabelStyles);
  return (
    <span css={styles.root}>
      <KeyPrefix name={name} isArrayItem={isArrayItem} />
      <span css={styles.bracket}>
        {OPEN_BRACKET[collectionType]}
        {CLOSE_BRACKET[collectionType]}
      </span>
      {trailingComma && <span css={styles.punctuation}>,</span>}
    </span>
  );
});

const ClosingBracketLabel = memo(function ClosingBracketLabel({
  collectionType,
  trailingComma,
}: {
  collectionType: 'object' | 'array';
  trailingComma: boolean;
}) {
  const styles = useMemoCss(nodeLabelStyles);
  return (
    <span
      className="jsonTreeClosingBracket"
      css={[styles.root, styles.closingBracket]}
      data-test-subj="jsonTreeClosingBracket"
    >
      <span css={styles.bracket}>{CLOSE_BRACKET[collectionType]}</span>
      {trailingComma && <span css={styles.punctuation}>,</span>}
    </span>
  );
});

// ---- Tree item builders (pure functions) ----

const buildClosingItem = (
  path: string[],
  collectionType: 'object' | 'array',
  trailingComma: boolean
): TreeItem => ({
  id: `${getItemId(path)}__close`,
  label: <ClosingBracketLabel collectionType={collectionType} trailingComma={trailingComma} />,
});

function buildTreeItem({
  name,
  path,
  value,
  isLast,
  isArrayItem,
}: {
  name: string;
  path: string[];
  value: unknown;
  isLast: boolean;
  isArrayItem: boolean;
}): TreeItem {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return {
        id: getItemId(path),
        label: (
          <EmptyCollectionLabel
            name={name}
            collectionType="array"
            trailingComma={!isLast}
            isArrayItem={isArrayItem}
          />
        ),
      };
    }
    return {
      id: getItemId(path),
      label: (
        <CollectionLabel
          name={name}
          count={value.length}
          collectionType="array"
          trailingComma={!isLast}
          isArrayItem={isArrayItem}
        />
      ),
      children: [
        ...value.map((childValue, index) =>
          buildTreeItem({
            name: String(index),
            path: [...path, String(index)],
            value: childValue,
            isLast: index === value.length - 1,
            isArrayItem: true,
          })
        ),
        buildClosingItem(path, 'array', !isLast),
      ],
    };
  }

  if (isJsonObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return {
        id: getItemId(path),
        label: (
          <EmptyCollectionLabel
            name={name}
            collectionType="object"
            trailingComma={!isLast}
            isArrayItem={isArrayItem}
          />
        ),
      };
    }
    return {
      id: getItemId(path),
      label: (
        <CollectionLabel
          name={name}
          count={entries.length}
          collectionType="object"
          trailingComma={!isLast}
          isArrayItem={isArrayItem}
        />
      ),
      children: [
        ...entries.map(([childName, childValue], index) =>
          buildTreeItem({
            name: childName,
            path: [...path, childName],
            value: childValue,
            isLast: index === entries.length - 1,
            isArrayItem: false,
          })
        ),
        buildClosingItem(path, 'object', !isLast),
      ],
    };
  }

  return {
    id: getItemId(path),
    label: (
      <LeafLabel
        name={name}
        value={normalizePrimitive(value)}
        trailingComma={!isLast}
        isArrayItem={isArrayItem}
      />
    ),
  };
}

function buildTreeItems(json: JsonValue): TreeItem[] {
  if (Array.isArray(json)) {
    return json.map((value, index) =>
      buildTreeItem({
        name: String(index),
        path: [String(index)],
        value,
        isLast: index === json.length - 1,
        isArrayItem: true,
      })
    );
  }

  if (isJsonObject(json)) {
    const entries = Object.entries(json);
    return entries.map(([name, value], index) =>
      buildTreeItem({
        name,
        path: [name],
        value,
        isLast: index === entries.length - 1,
        isArrayItem: false,
      })
    );
  }

  return [
    buildTreeItem({
      name: 'value',
      path: ['value'],
      value: json,
      isLast: true,
      isArrayItem: false,
    }),
  ];
}

// ---- Main component styles ----

const componentStyles = {
  treeWrapper: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
      fontFamily: euiTheme.font.familyCode,
      ...euiFontSize(euiThemeContext, 'xs'),
      // EUI renders tree rows as a fixed-height, single-line, clipped box. Relax the row
      // (`node`), its inner button, and the label so long values wrap onto multiple lines
      // (and the outdented closing bracket isn't clipped). `!important` is required to
      // beat EUI's own fixed-height/overflow rules on these elements.
      '.euiTreeView__node': {
        marginBottom: 0,
        // EUI clamps the row height with `max-block-size` (+ a fixed line-height); lift
        // the clamp so the row can grow to fit wrapped content.
        maxBlockSize: 'none',
        blockSize: 'auto',
        lineHeight: 'inherit',
      },
      '.euiTreeView__nodeInner': {
        height: 'auto !important',
        blockSize: 'auto !important',
        minHeight: euiTheme.size.l,
        alignItems: 'flex-start',
        // EUI's node button centres its text; JSON should read left-to-right.
        textAlign: 'start',
      },
      '.euiTreeView__nodeLabel': {
        overflow: 'visible !important',
      },
      // Hide the "{ N fields }" preview once a node is expanded; the real closing bracket
      // then renders as the last child instead. Keyed off EuiTreeView's own expanded
      // class, so it also tracks manual (single-node) toggles.
      '.euiTreeView__node--expanded > .euiTreeView__nodeInner .jsonTreeCollapsedOnly': {
        display: 'none',
      },
      // Reveal the per-value copy button only while its row is hovered or focused.
      '.euiTreeView__nodeInner:hover .jsonTreeCopyButton, .euiTreeView__nodeInner:focus-within .jsonTreeCopyButton':
        {
          opacity: 1,
        },
    });
  },
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

  // Mirror individual node toggles (pointer / Enter / Space) into our expansion state so
  // `isAllExpanded` reflects manual toggles, not just bulk actions. Arrow-key expand /
  // collapse still isn't observable (EUI fires the node callback with `ignoreCallback`),
  // so that one path can leave the Expand/Collapse-all label momentarily stale.
  const onToggleNode = useCallback(
    (id: string) => setExpansionState((prev) => ({ ...prev, [id]: !prev[id] })),
    []
  );

  const visibleItems = useMemo(
    () => applyExpansionState(visibleSlice, expansionState, onToggleNode),
    [visibleSlice, expansionState, onToggleNode]
  );

  const hiddenCount = allItems.length - visibleSlice.length;
  const allExpandableIds = useMemo(() => getExpandableItemIds(allItems), [allItems]);
  const hasExpandableItems = allExpandableIds.length > 0;
  const isAllExpanded = hasExpandableItems && allExpandableIds.every((id) => expansionState[id]);
  const rootIsArray = Array.isArray(json);

  const expandAll = useCallback(() => {
    setVisibleCount(allItems.length);
    setExpansionState(Object.fromEntries(allExpandableIds.map((id) => [id, true])));
    setTreeKey((prev) => prev + 1);
  }, [allItems.length, allExpandableIds]);

  const collapseAll = useCallback(() => {
    setExpansionState({});
    setTreeKey((prev) => prev + 1);
  }, []);

  const showMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + VISIBLE_ITEMS_INCREMENT, allItems.length));
  }, [allItems.length]);

  const showAll = useCallback(() => {
    setVisibleCount(allItems.length);
  }, [allItems.length]);

  const showFewer = useCallback(() => {
    setVisibleCount(INITIAL_VISIBLE_ITEMS);
  }, []);

  const { openBracket, closeBracket } = useMemo(() => {
    if (Array.isArray(json)) return { openBracket: '[', closeBracket: ']' };
    if (isJsonObject(json)) return { openBracket: '{', closeBracket: '}' };
    return { openBracket: null, closeBracket: null };
  }, [json]);

  const nextShowCount = Math.min(VISIBLE_ITEMS_INCREMENT, hiddenCount);
  const treeId = `jsonTreeViewer-${treeKey}`;

  const paginationLabels = {
    more: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonTreeViewer.showMoreItemsButtonLabel', {
          defaultMessage: 'Show {count} more {count, plural, one {item} other {items}}',
          values: { count: nextShowCount },
        })
      : i18n.translate('unifiedDataTable.jsonTreeViewer.showMoreFieldsButtonLabel', {
          defaultMessage: 'Show {count} more {count, plural, one {field} other {fields}}',
          values: { count: nextShowCount },
        }),
    all: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonTreeViewer.showAllItemsButtonLabel', {
          defaultMessage: 'Show all items',
        })
      : i18n.translate('unifiedDataTable.jsonTreeViewer.showAllFieldsButtonLabel', {
          defaultMessage: 'Show all fields',
        }),
    fewer: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonTreeViewer.showFewerItemsButtonLabel', {
          defaultMessage: 'Show fewer items',
        })
      : i18n.translate('unifiedDataTable.jsonTreeViewer.showFewerFieldsButtonLabel', {
          defaultMessage: 'Show fewer fields',
        }),
  };

  return (
    <>
      {hasExpandableItems && (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              iconType={isAllExpanded ? 'fold' : 'unfold'}
              onClick={isAllExpanded ? collapseAll : expandAll}
              size="xs"
            >
              {isAllExpanded
                ? i18n.translate('unifiedDataTable.jsonTreeViewer.collapseAllButtonLabel', {
                    defaultMessage: 'Collapse all',
                  })
                : i18n.translate('unifiedDataTable.jsonTreeViewer.expandAllButtonLabel', {
                    defaultMessage: 'Expand all',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
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
      {(hiddenCount > 0 || visibleCount > INITIAL_VISIBLE_ITEMS) && (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          {visibleCount > INITIAL_VISIBLE_ITEMS && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty flush="left" iconType="arrowUp" onClick={showFewer} size="xs">
                {paginationLabels.fewer}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {hiddenCount > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty flush="left" iconType="plus" onClick={showMore} size="xs">
                  {paginationLabels.more}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty flush="left" iconType="listBullet" onClick={showAll} size="xs">
                  {paginationLabels.all}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      )}
    </>
  );
});
