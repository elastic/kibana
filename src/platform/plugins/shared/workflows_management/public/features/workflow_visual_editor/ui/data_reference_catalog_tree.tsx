/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldSearch, EuiIcon, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  DataReferenceCatalog,
  DataReferenceItem,
} from '../lib/build_data_reference_catalog';
import {
  flattenDataReferenceLeaves,
  formatDataReferenceToken,
  isDataReferenceDraggable,
  isDataReferenceExpandable,
  isDataReferenceInsertable,
} from '../lib/build_data_reference_catalog';
import { DataReferenceItemRowContent } from './data_reference_item_row';

const TREE_WIDTH = 340;
const ROW_HEIGHT = 34;
const NEST_INDENT = 16;

/** Transparent 1×1 used so the browser doesn't paint the default full-row drag image. */
const EMPTY_DRAG_IMAGE =
  typeof Image !== 'undefined'
    ? (() => {
        const img = new Image(1, 1);
        img.src =
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        return img;
      })()
    : null;

const startCompactDragGhost = (
  source: HTMLElement,
  clientX: number,
  clientY: number,
  styles: {
    readonly background: string;
    readonly border: string;
    readonly color: string;
    readonly reduceMotion: boolean;
  }
): HTMLElement => {
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-test-subj');
  ghost.removeAttribute('tabindex');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.querySelectorAll('[data-drag-preview-hide], [data-drag-grip]').forEach((node) => {
    node.remove();
  });
  // Drop the disclosure gutter — leaves are empty there and it pads the chip.
  const gutter = ghost.firstElementChild;
  if (gutter instanceof HTMLElement) {
    gutter.remove();
  }

  const width = source.getBoundingClientRect().width;
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '10000',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    width: `${width}px`,
    height: `${ROW_HEIGHT}px`,
    margin: '0',
    padding: '0 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: styles.color,
    background: styles.background,
    border: styles.border,
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.28)',
    overflow: 'hidden',
    transform: `translate(${clientX + 12}px, ${clientY + 8}px)`,
    transition: styles.reduceMotion
      ? 'none'
      : 'width 180ms ease, transform 180ms ease, box-shadow 180ms ease',
  });

  document.body.appendChild(ghost);

  // Shrink to icon + label only (badge already removed).
  window.requestAnimationFrame(() => {
    ghost.style.width = 'max-content';
    ghost.style.maxWidth = '280px';
    ghost.style.transform = `translate(${clientX + 12}px, ${clientY + 8}px) scale(0.96)`;
  });

  return ghost;
};

export interface DataReferenceCatalogTreeProps {
  readonly catalog: DataReferenceCatalog;
  /** Inserts `{{ path }}` at the consumer caret / drop target. */
  readonly onInsert: (token: string) => void;
  readonly 'data-test-subj'?: string;
}

type FlatRow = {
  readonly item: DataReferenceItem;
  readonly depth: number;
  readonly showOrigin: boolean;
  readonly groupId: string;
};

/**
 * Left-rail variable tree for the field-editor sub-flyout. Expandable rows
 * open in place (accordion); leaves insert on click. Same catalog model as the
 * inline picker.
 */
export function DataReferenceCatalogTree({
  catalog,
  onInsert,
  'data-test-subj': dataTestSubj = 'workflowDataReferenceCatalogTree',
}: DataReferenceCatalogTreeProps) {
  const { euiTheme } = useEuiTheme();
  const [search, setSearch] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<ReadonlySet<string>>(() => new Set());
  const [activePath, setActivePath] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const flatRows = useMemo((): readonly FlatRow[] => {
    if (isSearching) {
      return flattenDataReferenceLeaves(catalog)
        .filter(
          (item) =>
            item.path.toLowerCase().includes(query) ||
            item.label.toLowerCase().includes(query) ||
            item.subtitle?.toLowerCase().includes(query) ||
            item.originLabel.toLowerCase().includes(query)
        )
        .map((item) => ({ item, depth: 0, showOrigin: true, groupId: 'search' }));
    }

    const rows: FlatRow[] = [];
    const walk = (items: readonly DataReferenceItem[], depth: number, groupId: string) => {
      for (const item of items) {
        rows.push({ item, depth, showOrigin: false, groupId });
        if (isDataReferenceExpandable(item) && expandedPaths.has(item.path)) {
          walk(item.children ?? [], depth + 1, groupId);
        }
      }
    };
    for (const group of catalog.groups) {
      walk(group.items, 0, group.id);
    }
    return rows;
  }, [catalog, expandedPaths, isSearching, query]);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleActivate = useCallback(
    (item: DataReferenceItem) => {
      setActivePath(item.path);
      if (isDataReferenceExpandable(item)) {
        toggleExpanded(item.path);
        return;
      }
      if (isDataReferenceInsertable(item)) {
        onInsert(formatDataReferenceToken(item.path));
      }
    },
    [onInsert, toggleExpanded]
  );

  const [isDraggingPath, setIsDraggingPath] = useState<string | null>(null);
  const dragGhostRef = useRef<HTMLElement | null>(null);

  const clearDragGhost = useCallback(() => {
    dragGhostRef.current?.remove();
    dragGhostRef.current = null;
  }, []);

  useEffect(() => () => clearDragGhost(), [clearDragGhost]);

  const handleDragStart = useCallback((event: React.DragEvent, item: DataReferenceItem) => {
    if (!isDataReferenceDraggable(item)) {
      event.preventDefault();
      return;
    }
    setIsDraggingPath(item.path);
    event.dataTransfer.setData('text/plain', formatDataReferenceToken(item.path));
    event.dataTransfer.effectAllowed = 'copy';

    clearDragGhost();
    const source = event.currentTarget as HTMLElement;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    dragGhostRef.current = startCompactDragGhost(source, event.clientX, event.clientY, {
      background: euiTheme.colors.backgroundBaseElevated,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
      color: euiTheme.colors.textParagraph,
      reduceMotion,
    });
    if (EMPTY_DRAG_IMAGE) {
      event.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
    }
  }, [clearDragGhost, euiTheme]);

  const handleDrag = useCallback((event: React.DragEvent) => {
    const ghost = dragGhostRef.current;
    if (!ghost || (event.clientX === 0 && event.clientY === 0)) return;
    ghost.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 8}px) scale(0.96)`;
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDraggingPath(null);
    clearDragGhost();
  }, [clearDragGhost]);

  const focusRow = useCallback((path: string) => {
    setActivePath(path);
    const btn = listRef.current?.querySelector<HTMLElement>(
      `[data-test-subj="workflowDataReferenceTreeRow-${CSS.escape(path)}"]`
    );
    btn?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, item: DataReferenceItem) => {
      const expandable = isDataReferenceExpandable(item);
      const isOpen = expandedPaths.has(item.path);
      const navIndex = flatRows.findIndex((row) => row.item.path === item.path);

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = flatRows[Math.max(0, Math.min(flatRows.length - 1, navIndex + delta))];
        if (next) focusRow(next.item.path);
        return;
      }

      if (event.key === 'ArrowRight' && expandable && !isOpen) {
        event.preventDefault();
        toggleExpanded(item.path);
        return;
      }
      if (event.key === 'ArrowLeft' && expandable && isOpen) {
        event.preventDefault();
        toggleExpanded(item.path);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleActivate(item);
      }
    },
    [expandedPaths, flatRows, focusRow, handleActivate, toggleExpanded]
  );

  const renderItemRow = (row: FlatRow, isFirst: boolean) => {
    const { item, depth, showOrigin } = row;
    const expandable = isDataReferenceExpandable(item);
    const isOpen = expandedPaths.has(item.path);
    const draggable = isDataReferenceDraggable(item);
    const insertable = isDataReferenceInsertable(item);
    const isDragging = isDraggingPath === item.path;

    const gripExpandedCss = {
      width: 16,
      minWidth: 16,
      opacity: 1,
      marginInlineStart: 6,
    };
    const gripCollapsedCss = {
      width: 0,
      minWidth: 0,
      opacity: 0,
      overflow: 'hidden' as const,
      marginInlineStart: 0,
      transition: 'width 140ms ease, opacity 140ms ease, margin 140ms ease',
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    };

    return (
      <div key={`${item.path}-${depth}`}>
        <button
          type="button"
          role="treeitem"
          aria-expanded={expandable ? isOpen : undefined}
          draggable={draggable}
          data-test-subj={`workflowDataReferenceTreeRow-${item.path}`}
          tabIndex={activePath === item.path || (activePath === null && isFirst) ? 0 : -1}
          onClick={() => handleActivate(item)}
          onDragStart={(e) => handleDragStart(e, item)}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onKeyDown={(e) => handleKeyDown(e, item)}
          onFocus={() => setActivePath(item.path)}
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.s,
            width: '100%',
            height: ROW_HEIGHT,
            textAlign: 'left',
            padding: `0 ${euiTheme.size.s}`,
            border: 'none',
            background:
              // Expanded parents are containers — keep highlight for leaves /
              // collapsed rows only so the open folder doesn't look selected.
              activePath === item.path && !isOpen
                ? euiTheme.colors.backgroundBaseHighlighted
                : 'transparent',
            cursor: draggable
              ? isDragging
                ? 'grabbing'
                : 'grab'
              : insertable || expandable
                ? 'pointer'
                : 'default',
            minWidth: 0,
            '@media (prefers-reduced-motion: no-preference)': {
              transition: 'background 120ms ease',
            },
            '&:hover, &:focus-visible': {
              background: isOpen
                ? 'transparent'
                : euiTheme.colors.backgroundBaseHighlighted,
              ...(draggable ? { '[data-drag-grip]': gripExpandedCss } : {}),
            },
            ...(draggable
              ? { '&:focus-within': { '[data-drag-grip]': gripExpandedCss } }
              : {}),
          }}
        >
          {/* Fixed gutter — leaf chips stay aligned with container chips. */}
          <span
            css={{
              width: euiTheme.size.base,
              height: euiTheme.size.base,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden={!expandable}
          >
            {expandable ? (
              <EuiIcon
                type={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
                size="s"
                color="subdued"
                aria-hidden
              />
            ) : null}
          </span>
          <span
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: euiTheme.size.s,
              flex: '1 1 auto',
              minWidth: 0,
              height: '100%',
              // Nest under the parent's label column (past the arrow gutter).
              ...(depth > 0
                ? {
                    marginLeft: depth * NEST_INDENT,
                    paddingLeft: euiTheme.size.xs,
                  }
                : {}),
            }}
          >
            <DataReferenceItemRowContent item={item} showOrigin={showOrigin} hideChevron />
            {draggable ? (
              <span
                data-drag-grip
                aria-hidden
                css={{
                  ...gripCollapsedCss,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: euiTheme.colors.textSubdued,
                }}
              >
                <EuiIcon type="drag" size="s" />
              </span>
            ) : null}
          </span>
        </button>
      </div>
    );
  };

  let firstAssigned = false;

  return (
    <div
      data-test-subj={dataTestSubj}
      css={{
        width: TREE_WIDTH,
        minWidth: TREE_WIDTH,
        maxWidth: TREE_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        background: euiTheme.colors.backgroundBasePlain,
        minHeight: 0,
      }}
    >
      <div css={{ padding: `${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.s}` }}>
        <EuiFieldSearch
          compressed
          fullWidth
          placeholder={i18n.translate('workflows.dataReferenceTree.search', {
            defaultMessage: 'Search available data',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-test-subj="workflowDataReferenceTreeSearch"
        />
      </div>

      <div
        ref={listRef}
        role="tree"
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto',
          paddingBottom: euiTheme.size.m,
        }}
      >
        {isSearching ? (
          flatRows.length === 0 ? (
            <EuiText
              size="s"
              color="subdued"
              css={{ padding: euiTheme.size.m, textAlign: 'center' }}
            >
              {i18n.translate('workflows.dataReferenceTree.emptySearch', {
                defaultMessage: 'No matching references',
              })}
            </EuiText>
          ) : (
            flatRows.map((row) => {
              const isFirst = !firstAssigned;
              firstAssigned = true;
              return renderItemRow(row, isFirst);
            })
          )
        ) : (
          catalog.groups
            .filter((group) => group.items.length > 0)
            .map((group) => {
            const groupRows = flatRows.filter((row) => row.groupId === group.id);
            return (
              <div key={group.id} data-test-subj={`workflowDataReferenceTreeGroup-${group.id}`}>
                <div
                  css={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: euiTheme.size.xs,
                    padding: `10px ${euiTheme.size.m} 4px`,
                    background: euiTheme.colors.backgroundBasePlain,
                  }}
                >
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={{
                      fontWeight: euiTheme.font.weight.medium,
                    }}
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
                {groupRows.map((row) => {
                  const isFirst = !firstAssigned;
                  firstAssigned = true;
                  return renderItemRow(row, isFirst);
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
