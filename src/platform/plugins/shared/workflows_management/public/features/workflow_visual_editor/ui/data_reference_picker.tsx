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
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { DataReferenceItemRowContent } from './data_reference_item_row';

const PICKER_MAX_HEIGHT = 400;
/** Fixed floating-layer width — must not match the panel field width. */
const PICKER_WIDTH = 340;
/** Root browse view: show this many rows per group before "Show all". */
const ROOT_GROUP_ROW_CAP = 5;

type NavigableEntry =
  | { readonly kind: 'item'; readonly item: DataReferenceItem }
  | {
      readonly kind: 'expander';
      readonly groupId: DataReferenceGroupId;
      readonly expanded: boolean;
      readonly total: number;
    };

export interface DataReferencePickerProps {
  readonly catalog: DataReferenceCatalog;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onInsert: (token: string) => void;
  /** Anchor field — picker floats under it; does not resize to match field width. */
  readonly input: React.ReactElement;
  /**
   * Stretch the anchor to fill its parent height (field-editor pane). Inline
   * form fields leave this unset so the popover sizes to the control.
   */
  readonly fillHeight?: boolean;
  readonly 'data-test-subj'?: string;
}

/**
 * On-demand data reference popover — search, drill, keyboard insert.
 * Floating ~340px layer under the field; does not reflow the form panel.
 */
export function DataReferencePicker({
  catalog,
  isOpen,
  onClose,
  onInsert,
  input,
  fillHeight = false,
  'data-test-subj': dataTestSubj = 'workflowDataReferencePicker',
}: DataReferencePickerProps) {
  const { euiTheme } = useEuiTheme();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelElRef = useRef<HTMLElement | null>(null);
  const inputElRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [drillStack, setDrillStack] = useState<DataReferenceItem[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<DataReferenceGroupId>>(
    () => new Set()
  );

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setDrillStack([]);
      setHighlightIndex(0);
      setExpandedGroups(new Set());
      return;
    }
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  // Close when an ancestor of the anchor scrolls (e.g. the config panel body).
  useEffect(() => {
    if (!isOpen) return;
    const closePopoverOnScroll = (event: Event) => {
      const scrollTarget = event.target;
      const panelEl = panelElRef.current;
      const inputEl = inputElRef.current;
      if (!panelEl || !inputEl || !(scrollTarget instanceof Node)) return;
      if (panelEl.contains(scrollTarget) || inputEl.contains(scrollTarget)) return;
      if (scrollTarget instanceof Element && !scrollTarget.contains(inputEl)) return;
      onClose();
    };
    const timeoutId = window.setTimeout(() => {
      window.addEventListener('scroll', closePopoverOnScroll, {
        passive: true,
        capture: true,
      });
    }, 500);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('scroll', closePopoverOnScroll, { capture: true });
    };
  }, [isOpen, onClose]);

  const drilledItem = drillStack.length > 0 ? drillStack[drillStack.length - 1] : undefined;

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query) {
      const leaves = flattenDataReferenceLeaves(catalog).filter(
        (item) =>
          item.path.toLowerCase().includes(query) ||
          item.label.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query) ||
          item.originLabel.toLowerCase().includes(query)
      );
      return { mode: 'search' as const, items: leaves, groups: [] as DataReferenceGroup[] };
    }
    if (drilledItem?.children) {
      return {
        mode: 'drill' as const,
        items: drilledItem.children,
        groups: [] as DataReferenceGroup[],
      };
    }
    return { mode: 'browse' as const, items: [] as DataReferenceItem[], groups: catalog.groups.filter((g) => g.items.length > 0) };
  }, [catalog, drilledItem, search]);

  const flatNavigable = useMemo((): readonly NavigableEntry[] => {
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
  }, [expandedGroups, visibleRows]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search, drillStack, isOpen, expandedGroups]);

  const toggleGroupExpanded = useCallback((groupId: DataReferenceGroupId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const insertItem = useCallback(
    (item: DataReferenceItem) => {
      if (item.drillable && item.children?.length) {
        setDrillStack((stack) => [...stack, item]);
        setSearch('');
        return;
      }
      if (!isDataReferenceInsertable(item)) return;
      onInsert(formatDataReferenceToken(item.path));
      onClose();
    },
    [onClose, onInsert]
  );

  const activateEntry = useCallback(
    (entry: NavigableEntry | undefined) => {
      if (!entry) return;
      if (entry.kind === 'expander') {
        toggleGroupExpanded(entry.groupId);
        return;
      }
      insertItem(entry.item);
    },
    [insertItem, toggleGroupExpanded]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (drillStack.length > 0 && !search) {
          setDrillStack((stack) => stack.slice(0, -1));
          return;
        }
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, Math.max(flatNavigable.length - 1, 0)));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        activateEntry(flatNavigable[highlightIndex]);
      }
      if (event.key === 'Backspace' && !search && drillStack.length > 0) {
        const target = event.target as HTMLInputElement;
        if (target.selectionStart === 0 && target.selectionEnd === 0) {
          event.preventDefault();
          setDrillStack((stack) => stack.slice(0, -1));
        }
      }
    },
    [activateEntry, drillStack.length, flatNavigable, highlightIndex, onClose, search]
  );

  const navigateBreadcrumb = useCallback((depth: number) => {
    // depth 0 = root ("Insert data"); depth N = keep first N stack entries.
    setDrillStack((stack) => stack.slice(0, depth));
    setSearch('');
  }, []);

  const renderItemRow = (item: DataReferenceItem, index: number, showOrigin: boolean) => {
    const isHighlighted = index === highlightIndex;
    const insertable = isDataReferenceInsertable(item);
    return (
      <button
        key={`${item.path}-${item.label}-${index}`}
        type="button"
        data-test-subj={`workflowDataReferenceRow-${item.path}`}
        draggable={insertable}
        onMouseEnter={() => setHighlightIndex(index)}
        onClick={() => insertItem(item)}
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
  };

  const renderExpanderRow = (
    entry: Extract<NavigableEntry, { kind: 'expander' }>,
    index: number
  ) => {
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
        key={`expander-${entry.groupId}`}
        type="button"
        data-test-subj={`workflowDataReferenceShowAll-${entry.groupId}`}
        onMouseEnter={() => setHighlightIndex(index)}
        onClick={() => toggleGroupExpanded(entry.groupId)}
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
  };

  const footerKeyCss = {
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

  const insertDataLabel = i18n.translate('workflows.dataReferencePicker.insertData', {
    defaultMessage: 'Insert data',
  });

  const popover = (
    <EuiPopover
      isOpen={isOpen}
      closePopover={onClose}
      button={
        <div
          ref={(el) => {
            inputElRef.current = el;
          }}
          css={{
            width: '100%',
            ...(fillHeight
              ? {
                  flex: '1 1 auto',
                  height: '100%',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }
              : {}),
          }}
        >
          {input}
        </div>
      }
      display="block"
      panelPaddingSize="none"
      anchorPosition="downLeft"
      hasArrow={false}
      ownFocus={false}
      repositionOnScroll
      data-test-subj={dataTestSubj}
      panelRef={(el) => {
        panelElRef.current = el;
      }}
      panelProps={{
        css: {
          width: PICKER_WIDTH,
          maxWidth: PICKER_WIDTH,
          maxHeight: PICKER_MAX_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          '&::after': {
            zIndex: 2,
          },
        },
      }}
    >
      <div
        onKeyDown={handleKeyDown}
        css={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxHeight: PICKER_MAX_HEIGHT,
          minHeight: 0,
        }}
      >
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          css={{ padding: euiTheme.size.s, paddingBottom: 0, flexWrap: 'wrap' }}
        >
          {drillStack.length > 0 && !search ? (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="chevronSingleLeft"
                size="xs"
                aria-label={i18n.translate('workflows.dataReferencePicker.back', {
                  defaultMessage: 'Back',
                })}
                onClick={() => setDrillStack((stack) => stack.slice(0, -1))}
                data-test-subj="workflowDataReferenceBack"
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow>
            {drillStack.length > 0 && !search ? (
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
                    onClick={() => navigateBreadcrumb(0)}
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
                        onClick={() => navigateBreadcrumb(i + 1)}
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

        <div css={{ padding: euiTheme.size.s, paddingBottom: euiTheme.size.s }}>
          <EuiFieldSearch
            inputRef={(el) => {
              searchRef.current = el;
            }}
            compressed
            fullWidth
            placeholder={i18n.translate('workflows.dataReferencePicker.search', {
              defaultMessage: 'Search',
            })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-test-subj="workflowDataReferenceSearch"
          />
        </div>

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
          {visibleRows.mode === 'browse'
            ? (() => {
                let index = 0;
                return visibleRows.groups.map((group) => {
                  const expanded = expandedGroups.has(group.id);
                  const showCap = !expanded && group.items.length > ROOT_GROUP_ROW_CAP;
                  const visibleItems = showCap
                    ? group.items.slice(0, ROOT_GROUP_ROW_CAP)
                    : group.items;
                  const nodes = visibleItems.map((item) => {
                    const row = renderItemRow(item, index, false);
                    index += 1;
                    return row;
                  });
                  let expander: React.ReactNode = null;
                  if (group.items.length > ROOT_GROUP_ROW_CAP) {
                    expander = renderExpanderRow(
                      {
                        kind: 'expander',
                        groupId: group.id,
                        expanded,
                        total: group.items.length,
                      },
                      index
                    );
                    index += 1;
                  }
                  return (
                    <div key={group.id} data-test-subj={`workflowDataReferenceGroup-${group.id}`}>
                      <div
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
                        <EuiText
                          size="xs"
                          color="subdued"
                          css={{ fontWeight: euiTheme.font.weight.medium }}
                        >
                          {group.title}
                        </EuiText>
                        <EuiIconTip
                          type="info"
                          color="subdued"
                          position="top"
                          content={group.description}
                        />
                      </div>
                      {nodes}
                      {expander}
                    </div>
                  );
                });
              })()
            : visibleRows.items.map((item, i) =>
                renderItemRow(item, i, visibleRows.mode === 'search')
              )}
          {flatNavigable.length === 0 && visibleRows.mode === 'search' ? (
            <EuiText
              size="s"
              color="subdued"
              css={{ padding: euiTheme.size.m, textAlign: 'center' }}
            >
              {i18n.translate('workflows.dataReferencePicker.empty', {
                defaultMessage: 'No matching references',
              })}
            </EuiText>
          ) : null}
        </div>

        <EuiText
          size="xs"
          color="subdued"
          css={{
            padding: euiTheme.size.s,
            '& kbd': footerKeyCss,
          }}
        >
          <FormattedMessage
            id="workflows.dataReferencePicker.footer"
            defaultMessage="Type {at} or {braces} in any field to open this"
            values={{
              at: <kbd>@</kbd>,
              braces: <kbd>{'{{'}</kbd>,
            }}
          />
        </EuiText>
      </div>
    </EuiPopover>
  );

  if (!fillHeight) {
    return popover;
  }

  // Stretch the popover anchor through EUI's display:block root without
  // overwriting EuiPopover's css prop (which would drop base styles).
  return (
    <div
      css={{
        flex: '1 1 auto',
        alignSelf: 'stretch',
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '& > .euiPopover': {
          flex: '1 1 auto',
          minHeight: 0,
          height: '100%',
          display: 'flex !important',
          flexDirection: 'column',
        },
      }}
    >
      {popover}
    </div>
  );
}
