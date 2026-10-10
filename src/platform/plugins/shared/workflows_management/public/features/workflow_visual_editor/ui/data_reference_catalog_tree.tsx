/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiIcon,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DataReferenceItemRowContent } from './data_reference_item_row';
import type { DataReferenceCatalog, DataReferenceItem } from '../lib/build_data_reference_catalog';
import {
  flattenDataReferenceLeaves,
  formatDataReferenceToken,
  isDataReferenceDraggable,
  isDataReferenceEntity,
  isDataReferenceExpandable,
  isDataReferenceInsertable,
} from '../lib/build_data_reference_catalog';

const TREE_WIDTH = 340;
/** Compact single-line row; grows when a subtitle/value is present. */
const ROW_MIN_HEIGHT = 40;
/** Vertical padding inside each tree row (top + bottom). */
const ROW_PADDING_Y = 2;
/** UI-shell mock latency for the catalog step Run control. */
const SHELL_RUN_DELAY_MS = 1400;

type StepRunStatus = 'running' | 'error';

/** Fake output branch injected after a successful shell run. */
const buildShellRunExtras = (stepItem: DataReferenceItem): readonly DataReferenceItem[] => {
  const ranAt = new Date().toISOString();
  const branchPath = `${stepItem.path}.__editor_run`;
  return [
    {
      path: branchPath,
      label: '__editor_run',
      typeLabel: 'object',
      drillable: true,
      originLabel: stepItem.originLabel,
      children: [
        {
          path: `${branchPath}.ran_at`,
          label: 'ran_at',
          typeLabel: 'string',
          subtitle: ranAt,
          drillable: false,
          originLabel: stepItem.originLabel,
        },
        {
          path: `${branchPath}.ok`,
          label: 'ok',
          typeLabel: 'boolean',
          subtitle: 'true',
          drillable: false,
          originLabel: stepItem.originLabel,
        },
      ],
    },
  ];
};

const withShellRunChildren = (
  item: DataReferenceItem,
  extrasByPath: Readonly<Record<string, readonly DataReferenceItem[]>>
): DataReferenceItem => {
  const extras = extrasByPath[item.path];
  if (!extras?.length) return item;
  // Step entities share `steps.*.output` with their opaque output leaf. Prefer
  // attaching run samples to that leaf so expand/collapse keys stay distinct.
  if (
    item.isEntity &&
    (item.children ?? []).some((child) => child.path === item.path && !child.isEntity)
  ) {
    return item;
  }
  const existing = item.children ?? [];
  const existingPaths = new Set(existing.map((child) => child.path));
  const merged = [...existing, ...extras.filter((child) => !existingPaths.has(child.path))];
  return { ...item, children: merged, drillable: true };
};

/**
 * Expand/collapse identity. Step entities reuse their output path as `path`, so
 * the nested opaque `output` leaf would share that string — keep them distinct.
 */
const getExpandKey = (item: DataReferenceItem): string =>
  item.isEntity ? `entity:${item.path}` : item.path;
/**
 * Nested-row indent. Tuned so child icons optically line up with the parent
 * category's label text (past the parent chevron + icon tile).
 */
const NEST_INDENT = 24;

/** Transparent 1×1 used so the browser doesn't paint the default full-row drag image. */
const EMPTY_DRAG_IMAGE =
  typeof Image !== 'undefined'
    ? (() => {
        const img = new Image(1, 1);
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
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
  // Never transition `transform` — the ghost tracks the cursor every frame and
  // a CSS ease on translate makes the chip lag behind the pointer.
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '10000',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    width: `${width}px`,
    height: `${ROW_MIN_HEIGHT}px`,
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
    willChange: 'transform',
    transform: `translate3d(${clientX + 12}px, ${clientY + 8}px, 0) scale(0.96)`,
    transition: styles.reduceMotion ? 'none' : 'width 180ms ease, box-shadow 180ms ease',
  });

  document.body.appendChild(ghost);

  // Shrink to icon + label only (badge already removed). Do not touch
  // `transform` here — drag handlers own position every frame.
  window.requestAnimationFrame(() => {
    ghost.style.width = 'max-content';
    ghost.style.maxWidth = '280px';
    ghost.style.height = 'auto';
    ghost.style.minHeight = `${ROW_MIN_HEIGHT}px`;
  });

  return ghost;
};

export interface DataReferenceCatalogTreeProps {
  readonly catalog: DataReferenceCatalog;
  /** Inserts `{{ path }}` at the consumer caret / drop target. */
  readonly onInsert: (token: string) => void;
  readonly 'data-test-subj'?: string;
}

interface FlatRow {
  readonly item: DataReferenceItem;
  readonly depth: number;
  readonly showOrigin: boolean;
  readonly groupId: string;
}

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
  const [activeExpandKey, setActiveExpandKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  /** UI-shell only — not wired to test-step execution. */
  const [stepRunStatus, setStepRunStatus] = useState<Readonly<Record<string, StepRunStatus>>>({});
  const [stepRunErrors, setStepRunErrors] = useState<Readonly<Record<string, string>>>({});
  const [shellRunExtras, setShellRunExtras] = useState<
    Readonly<Record<string, readonly DataReferenceItem[]>>
  >({});
  const shellRunTimersRef = useRef<Map<string, number>>(new Map());

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  useEffect(
    () => () => {
      for (const timer of shellRunTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      shellRunTimersRef.current.clear();
    },
    []
  );

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
      for (const raw of items) {
        const item = withShellRunChildren(raw, shellRunExtras);
        rows.push({ item, depth, showOrigin: false, groupId });
        if (isDataReferenceExpandable(item) && expandedPaths.has(getExpandKey(item))) {
          walk(item.children ?? [], depth + 1, groupId);
        }
      }
    };
    for (const group of catalog.groups) {
      walk(group.items, 0, group.id);
    }
    return rows;
  }, [catalog, expandedPaths, isSearching, query, shellRunExtras]);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandPath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  const clearStepRunError = useCallback((path: string) => {
    setStepRunStatus((prev) => {
      if (prev[path] !== 'error') return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setStepRunErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  const handleShellStepRun = useCallback(
    (item: DataReferenceItem, forceError: boolean) => {
      if (!isDataReferenceEntity(item) || stepRunStatus[item.path] === 'running') return;

      const existingTimer = shellRunTimersRef.current.get(item.path);
      if (existingTimer != null) window.clearTimeout(existingTimer);

      setStepRunStatus((prev) => ({ ...prev, [item.path]: 'running' }));
      setStepRunErrors((prev) => {
        if (!(item.path in prev)) return prev;
        const next = { ...prev };
        delete next[item.path];
        return next;
      });

      const timer = window.setTimeout(() => {
        shellRunTimersRef.current.delete(item.path);
        if (forceError) {
          setStepRunStatus((prev) => ({ ...prev, [item.path]: 'error' }));
          setStepRunErrors((prev) => ({
            ...prev,
            [item.path]: i18n.translate('workflows.dataReferenceTree.shellRunError', {
              defaultMessage: 'Shell run failed for {step}. (Alt/Option+click forces this state.)',
              values: { step: item.label },
            }),
          }));
          return;
        }

        setStepRunStatus((prev) => {
          const next = { ...prev };
          delete next[item.path];
          return next;
        });
        setShellRunExtras((prev) => ({
          ...prev,
          [item.path]: buildShellRunExtras(item),
        }));
        expandPath(getExpandKey(item));
        // Opaque output leaf shares the entity liquid path — expand it too so
        // shell samples nested under `output` are visible after a run.
        expandPath(item.path);
        expandPath(`${item.path}.__editor_run`);
      }, SHELL_RUN_DELAY_MS);

      shellRunTimersRef.current.set(item.path, timer);
    },
    [expandPath, stepRunStatus]
  );

  const handleActivate = useCallback(
    (item: DataReferenceItem) => {
      setActiveExpandKey(getExpandKey(item));
      if (isDataReferenceExpandable(item)) {
        toggleExpanded(getExpandKey(item));
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
  const dragGhostRafRef = useRef<number | null>(null);
  const dragPointerRef = useRef({ x: 0, y: 0 });

  const clearDragGhost = useCallback(() => {
    if (dragGhostRafRef.current != null) {
      window.cancelAnimationFrame(dragGhostRafRef.current);
      dragGhostRafRef.current = null;
    }
    dragGhostRef.current?.remove();
    dragGhostRef.current = null;
  }, []);

  useEffect(() => () => clearDragGhost(), [clearDragGhost]);

  const handleDragStart = useCallback(
    (event: React.DragEvent, item: DataReferenceItem) => {
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
      dragPointerRef.current = { x: event.clientX, y: event.clientY };
      dragGhostRef.current = startCompactDragGhost(source, event.clientX, event.clientY, {
        background: euiTheme.colors.backgroundBaseElevated,
        border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        color: euiTheme.colors.textParagraph,
        reduceMotion,
      });
      if (EMPTY_DRAG_IMAGE) {
        event.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
      }
    },
    [clearDragGhost, euiTheme]
  );

  const handleDrag = useCallback((event: React.DragEvent) => {
    if (event.clientX === 0 && event.clientY === 0) return;
    dragPointerRef.current = { x: event.clientX, y: event.clientY };
    if (dragGhostRafRef.current != null) return;
    dragGhostRafRef.current = window.requestAnimationFrame(() => {
      dragGhostRafRef.current = null;
      const ghost = dragGhostRef.current;
      if (!ghost) return;
      const { x, y } = dragPointerRef.current;
      ghost.style.transform = `translate3d(${x + 12}px, ${y + 8}px, 0) scale(0.96)`;
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDraggingPath(null);
    clearDragGhost();
  }, [clearDragGhost]);

  const focusRow = useCallback((expandKey: string) => {
    setActiveExpandKey(expandKey);
    const btn = listRef.current?.querySelector<HTMLElement>(
      `[data-test-subj="workflowDataReferenceTreeRow-${CSS.escape(expandKey)}"]`
    );
    btn?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, item: DataReferenceItem) => {
      const expandable = isDataReferenceExpandable(item);
      const expandKey = getExpandKey(item);
      const isOpen = expandedPaths.has(expandKey);
      const navIndex = flatRows.findIndex((row) => getExpandKey(row.item) === expandKey);

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = flatRows[Math.max(0, Math.min(flatRows.length - 1, navIndex + delta))];
        if (next) focusRow(getExpandKey(next.item));
        return;
      }

      if (event.key === 'ArrowRight' && expandable && !isOpen) {
        event.preventDefault();
        toggleExpanded(expandKey);
        return;
      }
      if (event.key === 'ArrowLeft' && expandable && isOpen) {
        event.preventDefault();
        toggleExpanded(expandKey);
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
    const { item, depth, showOrigin, groupId } = row;
    const expandable = isDataReferenceExpandable(item);
    const expandKey = getExpandKey(item);
    const isOpen = expandedPaths.has(expandKey);
    const draggable = isDataReferenceDraggable(item);
    const insertable = isDataReferenceInsertable(item);
    const isDragging = isDraggingPath === item.path;
    const canShellRun = !isSearching && groupId === 'steps' && isDataReferenceEntity(item);
    const runStatus = stepRunStatus[item.path];
    const runError = stepRunErrors[item.path];

    const gripCss = {
      width: 16,
      minWidth: 16,
      opacity: 1,
      marginInlineStart: 6,
      display: 'inline-flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
      color: euiTheme.colors.textSubdued,
    };

    const runLabel = i18n.translate('workflows.dataReferenceTree.runStep', {
      defaultMessage: 'Test this step',
    });

    const rowHighlight =
      activeExpandKey === expandKey && !isOpen
        ? euiTheme.colors.backgroundBaseHighlighted
        : 'transparent';

    return (
      <div
        key={`${expandKey}-${depth}`}
        css={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minHeight: ROW_MIN_HEIGHT,
          background: rowHighlight,
          '@media (prefers-reduced-motion: no-preference)': {
            transition: 'background 120ms ease',
          },
          '&:hover, &:focus-within': {
            background: isOpen ? 'transparent' : euiTheme.colors.backgroundBaseHighlighted,
          },
          // Hover-reveal Run; keep visible while running / errored / focused.
          '& [data-run-control]': {
            opacity: runStatus != null ? 1 : 0,
          },
          '&:hover [data-run-control], &:focus-within [data-run-control]': {
            opacity: 1,
          },
        }}
      >
        <button
          type="button"
          role="treeitem"
          aria-expanded={expandable ? isOpen : undefined}
          draggable={draggable}
          data-test-subj={`workflowDataReferenceTreeRow-${expandKey}`}
          tabIndex={activeExpandKey === expandKey || (activeExpandKey === null && isFirst) ? 0 : -1}
          onClick={() => handleActivate(item)}
          onDragStart={(e) => handleDragStart(e, item)}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onKeyDown={(e) => handleKeyDown(e, item)}
          onFocus={() => setActiveExpandKey(expandKey)}
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.xs,
            flex: '1 1 auto',
            minWidth: 0,
            minHeight: ROW_MIN_HEIGHT,
            height: 'auto',
            textAlign: 'left',
            padding: `${ROW_PADDING_Y}px ${euiTheme.size.s}`,
            paddingInlineEnd: canShellRun ? euiTheme.size.xs : euiTheme.size.s,
            border: 'none',
            background: 'transparent',
            cursor: draggable
              ? isDragging
                ? 'grabbing'
                : 'grab'
              : insertable || expandable
              ? 'pointer'
              : 'default',
          }}
        >
          {/* Indent before the disclosure so nested chevrons sit next to their icons. */}
          {depth > 0 ? (
            <span
              aria-hidden
              css={{
                width: depth * NEST_INDENT,
                flexShrink: 0,
              }}
            />
          ) : null}
          {/* Fixed gutter — leaf chips stay aligned with sibling container chips. */}
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
            }}
          >
            <DataReferenceItemRowContent item={item} showOrigin={showOrigin} hideChevron />
          </span>
          {draggable ? (
            <span data-drag-grip aria-hidden css={gripCss}>
              <EuiIcon type="drag" size="s" aria-hidden={true} />
            </span>
          ) : null}
        </button>
        {canShellRun ? (
          <span
            data-run-control
            data-drag-preview-hide
            css={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              marginInlineEnd: euiTheme.size.xs,
            }}
          >
            {runStatus === 'running' ? (
              <EuiLoadingSpinner
                size="m"
                data-test-subj={`workflowDataReferenceTreeRunSpinner-${item.path}`}
              />
            ) : runStatus === 'error' ? (
              <EuiToolTip content={runError} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="error"
                  color="danger"
                  size="xs"
                  aria-label={
                    runError ??
                    i18n.translate('workflows.dataReferenceTree.runStepError', {
                      defaultMessage: 'Step run failed',
                    })
                  }
                  data-test-subj={`workflowDataReferenceTreeRunError-${item.path}`}
                  onMouseLeave={() => clearStepRunError(item.path)}
                />
              </EuiToolTip>
            ) : (
              <EuiToolTip content={runLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="play"
                  size="xs"
                  color="success"
                  aria-label={runLabel}
                  data-test-subj={`workflowDataReferenceTreeRun-${item.path}`}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleShellStepRun(item, e.altKey);
                  }}
                />
              </EuiToolTip>
            )}
          </span>
        ) : null}
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
                    {group.iconType ? (
                      <EuiIcon type={group.iconType} size="s" color="subdued" aria-hidden />
                    ) : null}
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
