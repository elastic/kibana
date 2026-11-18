/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataReferenceItemRowContent } from './data_reference_item_row';
import type {
  DataReferenceCatalog,
  DataReferenceGroup,
  DataReferenceGroupId,
  DataReferenceItem,
} from '../lib/build_data_reference_catalog';
import {
  flattenDataReferenceLeaves,
  formatDataReferenceToken,
  isDataReferenceInsertable,
} from '../lib/build_data_reference_catalog';

/** Root browse view: show this many rows per group before "Show all". */
const ROOT_GROUP_ROW_CAP = 5;

export type NavigableEntry =
  | { readonly kind: 'item'; readonly item: DataReferenceItem }
  | {
      readonly kind: 'expander';
      readonly groupId: DataReferenceGroupId;
      readonly expanded: boolean;
      readonly total: number;
    };

/** Most search matches drawn; a sample output can match thousands of rows. */
const MAX_SEARCH_ROWS = 100;

export interface VisibleRows {
  readonly mode: 'search' | 'drill' | 'browse';
  readonly items: readonly DataReferenceItem[];
  /** In search mode, how many leaves matched before the list was capped. */
  readonly totalMatches?: number;
  readonly groups: readonly DataReferenceGroup[];
}

/** What the list shows: the leaves that match a search, the children of a drilled item, or the groups. */
export const getVisibleRows = (
  catalog: DataReferenceCatalog,
  search: string,
  drilledItem: DataReferenceItem | undefined
): VisibleRows => {
  const query = search.trim().toLowerCase();
  if (query) {
    const leaves = flattenDataReferenceLeaves(catalog).filter(
      (item) =>
        item.path.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query) ||
        item.subtitle?.toLowerCase().includes(query) ||
        item.originLabel.toLowerCase().includes(query)
    );
    return {
      mode: 'search',
      items: leaves.slice(0, MAX_SEARCH_ROWS),
      totalMatches: leaves.length,
      groups: [],
    };
  }
  if (drilledItem?.children) {
    return { mode: 'drill', items: drilledItem.children, groups: [] };
  }
  return { mode: 'browse', items: [], groups: catalog.groups.filter((g) => g.items.length > 0) };
};

/** The rows the keyboard walks, in the order they are drawn, "Show all" included. */
export const getNavigableEntries = (
  visibleRows: VisibleRows,
  expandedGroups: ReadonlySet<DataReferenceGroupId>
): readonly NavigableEntry[] => {
  if (visibleRows.mode !== 'browse') {
    return visibleRows.items.map((item) => ({ kind: 'item' as const, item }));
  }
  const entries: NavigableEntry[] = [];
  for (const group of visibleRows.groups) {
    const expanded = expandedGroups.has(group.id);
    const capped =
      !expanded && group.items.length > ROOT_GROUP_ROW_CAP
        ? group.items.slice(0, ROOT_GROUP_ROW_CAP)
        : group.items;
    for (const item of capped) {
      entries.push({ kind: 'item', item });
    }
    if (group.items.length > ROOT_GROUP_ROW_CAP) {
      entries.push({
        kind: 'expander',
        groupId: group.id,
        expanded,
        total: group.items.length,
      });
    }
  }
  return entries;
};

const insertDataLabel = i18n.translate('workflows.dataReferencePicker.insertData', {
  defaultMessage: 'Insert data',
});

/** "Insert data", or the way back out of the item that was drilled into. */
export function PickerHeader({
  drillStack,
  isDrilled,
  onBack,
  onNavigate,
}: {
  readonly drillStack: readonly DataReferenceItem[];
  /** In a drilled view with no search typed, where the way back is shown. */
  readonly isDrilled: boolean;
  readonly onBack: () => void;
  /** depth 0 = root ("Insert data"); depth N = keep the first N drilled items. */
  readonly onNavigate: (depth: number) => void;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={{ padding: euiTheme.size.s, paddingBottom: 0, flexWrap: 'wrap' }}
    >
      {isDrilled ? (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="chevronSingleLeft"
            size="xs"
            aria-label={i18n.translate('workflows.dataReferencePicker.back', {
              defaultMessage: 'Back',
            })}
            onClick={onBack}
            data-test-subj="workflowDataReferenceBack"
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow>
        {isDrilled ? (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            wrap
            data-test-subj="workflowDataReferenceBreadcrumb"
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="both"
                onClick={() => onNavigate(0)}
                css={{ fontWeight: euiTheme.font.weight.bold, fontSize: 12 }}
              >
                {insertDataLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {drillStack.map((segment, i) => (
              <React.Fragment key={`${segment.path}-${i}`}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    ›
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    flush="both"
                    onClick={() => onNavigate(i + 1)}
                    css={{ fontWeight: euiTheme.font.weight.bold, fontSize: 12 }}
                  >
                    {segment.label}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </React.Fragment>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiText size="xs" css={{ fontWeight: euiTheme.font.weight.bold, fontSize: 12 }}>
            {insertDataLabel}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface RowHandlers {
  readonly highlightIndex: number;
  /** Set on the highlighted row, so the list can scroll it into view. */
  readonly highlightedRowRef: React.MutableRefObject<HTMLButtonElement | null>;
  readonly onHighlight: (index: number) => void;
  readonly onPick: (item: DataReferenceItem) => void;
  readonly onToggleGroup: (groupId: DataReferenceGroupId) => void;
}

function ItemRow({
  item,
  index,
  showOrigin,
  highlightIndex,
  highlightedRowRef,
  onHighlight,
  onPick,
}: {
  readonly item: DataReferenceItem;
  readonly index: number;
  readonly showOrigin: boolean;
} & Pick<RowHandlers, 'highlightIndex' | 'highlightedRowRef' | 'onHighlight' | 'onPick'>) {
  const { euiTheme } = useEuiTheme();
  const isHighlighted = index === highlightIndex;
  const insertable = isDataReferenceInsertable(item);
  return (
    <button
      type="button"
      role="option"
      aria-selected={isHighlighted}
      ref={isHighlighted ? highlightedRowRef : undefined}
      data-test-subj={`workflowDataReferenceRow-${item.path}`}
      draggable={insertable}
      onMouseEnter={() => onHighlight(index)}
      onClick={() => onPick(item)}
      onDragStart={
        insertable
          ? (e) => {
              e.dataTransfer.setData('text/plain', formatDataReferenceToken(item.path));
              e.dataTransfer.effectAllowed = 'copy';
            }
          : undefined
      }
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.s,
        width: '100%',
        textAlign: 'left',
        padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
        border: 'none',
        background: isHighlighted ? euiTheme.colors.backgroundBaseHighlighted : 'transparent',
        cursor: insertable ? 'grab' : 'pointer',
        minWidth: 0,
      }}
    >
      <DataReferenceItemRowContent item={item} showOrigin={showOrigin} />
    </button>
  );
}

function ExpanderRow({
  entry,
  index,
  highlightIndex,
  highlightedRowRef,
  onHighlight,
  onToggleGroup,
}: {
  readonly entry: Extract<NavigableEntry, { kind: 'expander' }>;
  readonly index: number;
} & Pick<RowHandlers, 'highlightIndex' | 'highlightedRowRef' | 'onHighlight' | 'onToggleGroup'>) {
  const { euiTheme } = useEuiTheme();
  const isHighlighted = index === highlightIndex;
  const label = entry.expanded
    ? i18n.translate('workflows.dataReferencePicker.showFewer', {
        defaultMessage: 'Show fewer',
      })
    : i18n.translate('workflows.dataReferencePicker.showAll', {
        defaultMessage: 'Show all ({count})',
        values: { count: entry.total },
      });
  return (
    <button
      type="button"
      role="option"
      aria-selected={isHighlighted}
      ref={isHighlighted ? highlightedRowRef : undefined}
      data-test-subj={`workflowDataReferenceShowAll-${entry.groupId}`}
      onMouseEnter={() => onHighlight(index)}
      onClick={() => onToggleGroup(entry.groupId)}
      css={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
        border: 'none',
        background: isHighlighted ? euiTheme.colors.backgroundBaseHighlighted : 'transparent',
        cursor: 'pointer',
        color: euiTheme.colors.textSubdued,
        fontSize: euiTheme.size.m,
      }}
    >
      {label}
    </button>
  );
}

function GroupHeading({ group }: { readonly group: DataReferenceGroup }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden
      css={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.xs,
        padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
        background: euiTheme.colors.backgroundBaseSubdued,
      }}
    >
      {group.iconType ? (
        <EuiIcon type={group.iconType} size="s" color="subdued" aria-hidden />
      ) : null}
      <EuiText size="xs" color="subdued" css={{ fontWeight: euiTheme.font.weight.medium }}>
        {group.title}
      </EuiText>
      <EuiIconTip type="info" color="subdued" position="top" content={group.description} />
    </div>
  );
}

/** The scrolling body: the groups of references, or a flat list of the ones that match. */
export function ReferenceList({
  visibleRows,
  expandedGroups,
  isEmpty,
  ...handlers
}: {
  readonly visibleRows: VisibleRows;
  readonly expandedGroups: ReadonlySet<DataReferenceGroupId>;
  /** A search matched nothing. */
  readonly isEmpty: boolean;
} & RowHandlers) {
  const { euiTheme } = useEuiTheme();

  const renderGroups = () => {
    let index = 0;
    return visibleRows.groups.map((group) => {
      const expanded = expandedGroups.has(group.id);
      const showCap = !expanded && group.items.length > ROOT_GROUP_ROW_CAP;
      const visibleItems = showCap ? group.items.slice(0, ROOT_GROUP_ROW_CAP) : group.items;
      const rows = visibleItems.map((item) => {
        const row = (
          <ItemRow
            key={`${item.path}-${item.label}-${index}`}
            item={item}
            index={index}
            showOrigin={false}
            {...handlers}
          />
        );
        index += 1;
        return row;
      });
      let expander: React.ReactNode = null;
      if (group.items.length > ROOT_GROUP_ROW_CAP) {
        expander = (
          <ExpanderRow
            key={`expander-${group.id}`}
            entry={{ kind: 'expander', groupId: group.id, expanded, total: group.items.length }}
            index={index}
            {...handlers}
          />
        );
        index += 1;
      }
      return (
        <div
          key={group.id}
          role="group"
          aria-label={group.title}
          data-test-subj={`workflowDataReferenceGroup-${group.id}`}
        >
          <GroupHeading group={group} />
          {rows}
          {expander}
        </div>
      );
    });
  };

  return (
    <div
      css={{
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'auto',
        paddingBottom: euiTheme.size.xs,
        borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
        borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      }}
      data-test-subj="workflowDataReferenceBody"
    >
      <div
        role="listbox"
        aria-label={i18n.translate('workflows.dataReferencePicker.listLabel', {
          defaultMessage: 'References',
        })}
      >
        {visibleRows.mode === 'browse'
          ? renderGroups()
          : visibleRows.items.map((item, i) => (
              <ItemRow
                key={`${item.path}-${item.label}-${i}`}
                item={item}
                index={i}
                showOrigin={visibleRows.mode === 'search'}
                {...handlers}
              />
            ))}
      </div>
      {visibleRows.totalMatches !== undefined && visibleRows.totalMatches > visibleRows.items.length ? (
        <EuiText
          size="xs"
          color="subdued"
          css={{ padding: euiTheme.size.m, textAlign: 'center' }}
          data-test-subj="workflowDataReferenceSearchCapped"
        >
          {i18n.translate('workflows.dataReferencePicker.searchCapped', {
            defaultMessage:
              'Showing the first {shown} of {total} matches. Refine your search to narrow it down.',
            values: { shown: visibleRows.items.length, total: visibleRows.totalMatches },
          })}
        </EuiText>
      ) : null}
      {isEmpty ? (
        <EuiText size="s" color="subdued" css={{ padding: euiTheme.size.m, textAlign: 'center' }}>
          {i18n.translate('workflows.dataReferencePicker.empty', {
            defaultMessage: 'No matching references',
          })}
        </EuiText>
      ) : null}
    </div>
  );
}

export function PickerFooter() {
  const { euiTheme } = useEuiTheme();
  const keyCss = {
    display: 'inline-block' as const,
    padding: `0 ${euiTheme.size.xs}`,
    borderRadius: euiTheme.border.radius.small,
    border: `${euiTheme.border.width.thin} solid ${transparentize(
      euiTheme.colors.textParagraph,
      0.2
    )}`,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    fontFamily: euiTheme.font.familyCode,
    fontSize: 'inherit',
    fontWeight: euiTheme.font.weight.medium,
  };
  return (
    <EuiText size="xs" color="subdued" css={{ padding: euiTheme.size.s, '& kbd': keyCss }}>
      <FormattedMessage
        id="workflows.dataReferencePicker.footer"
        defaultMessage="Type {braces} in a text field to insert data"
        values={{
          braces: <kbd>{'{{'}</kbd>,
        }}
      />
    </EuiText>
  );
}
