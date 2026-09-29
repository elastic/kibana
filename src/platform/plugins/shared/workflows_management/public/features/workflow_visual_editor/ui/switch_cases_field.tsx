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
  EuiConfirmModal,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
  euiDragDropReorder,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
  type DropResult,
  type EuiDragDropContextProps,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';

/** Compressed field height — matches the dashed drop-slot outline. */
const CASE_FIELD_HEIGHT_PX = 32;

export interface SwitchCaseFormValue {
  readonly match: string | number | boolean;
  readonly steps?: readonly unknown[];
}

export interface SwitchCaseRow {
  readonly id: string;
  readonly match: string;
  readonly steps: readonly unknown[];
}

const newRowId = (): string =>
  `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const toSwitchCaseRows = (value: unknown): SwitchCaseRow[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const rec = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const match = rec.match;
    return {
      id: `case-${index}`,
      match: match === undefined || match === null ? '' : String(match),
      steps: Array.isArray(rec.steps) ? rec.steps : [],
    };
  });
};

export const switchCaseRowsToValue = (
  rows: readonly SwitchCaseRow[]
): SwitchCaseFormValue[] =>
  rows.map((row) => ({
    match: row.match,
    steps: [...row.steps],
  }));

/** Trimmed, case-insensitive duplicate key for live warnings. */
export const switchCaseDuplicateKey = (match: string): string => match.trim().toLowerCase();

export const findDuplicateCaseIds = (rows: readonly SwitchCaseRow[]): ReadonlySet<string> => {
  const counts = new Map<string, string[]>();
  for (const row of rows) {
    const key = switchCaseDuplicateKey(row.match);
    if (!key) continue;
    const list = counts.get(key) ?? [];
    list.push(row.id);
    counts.set(key, list);
  }
  const dupes = new Set<string>();
  for (const ids of counts.values()) {
    if (ids.length > 1) {
      for (const id of ids) dupes.add(id);
    }
  }
  return dupes;
};

/** Counts configured steps under a case (nested children included). */
export const countConfiguredSteps = (steps: unknown): number => {
  if (!Array.isArray(steps)) return 0;
  let total = 0;
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    total += 1;
    const rec = step as Record<string, unknown>;
    total += countConfiguredSteps(rec.steps);
    total += countConfiguredSteps(rec.else);
    total += countConfiguredSteps(rec.fallback);
    total += countConfiguredSteps(rec.default);
    if (Array.isArray(rec.cases)) {
      for (const c of rec.cases) {
        if (c && typeof c === 'object') {
          total += countConfiguredSteps((c as { steps?: unknown }).steps);
        }
      }
    }
    if (Array.isArray(rec.branches)) {
      for (const b of rec.branches) {
        if (b && typeof b === 'object') {
          total += countConfiguredSteps((b as { steps?: unknown }).steps);
        }
      }
    }
  }
  return total;
};

export interface SwitchCasesFieldProps {
  readonly value: unknown;
  readonly onChange: (next: SwitchCaseFormValue[]) => void;
}

export function SwitchCasesField({ value, onChange }: SwitchCasesFieldProps) {
  const { euiTheme } = useEuiTheme();
  const droppableId = useGeneratedHtmlId({ prefix: 'workflowSwitchCasesDrop' });
  const [rows, setRows] = useState<SwitchCaseRow[]>(() => toSwitchCaseRows(value));
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SwitchCaseRow | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [dragOver, setDragOver] = useState<{
    index: number;
    edge: 'top' | 'bottom';
  } | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const valueFingerprint = useMemo(() => JSON.stringify(value ?? null), [value]);

  // Sync from parent when the fragment changes externally (Apply / reopen).
  useEffect(() => {
    setRows((prev) => {
      const incoming = toSwitchCaseRows(value);
      if (
        JSON.stringify(switchCaseRowsToValue(prev)) ===
        JSON.stringify(switchCaseRowsToValue(incoming))
      ) {
        return prev;
      }
      return incoming.map((row, index) => ({
        ...row,
        id: prev[index]?.id ?? newRowId(),
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprint tracks value identity
  }, [valueFingerprint]);

  useEffect(() => {
    if (!focusRowId) return;
    const el = inputRefs.current.get(focusRowId);
    if (el) {
      el.focus();
      el.select();
    }
    setFocusRowId(null);
  }, [focusRowId, rows]);

  const duplicateIds = useMemo(() => findDuplicateCaseIds(rows), [rows]);

  const emit = useCallback(
    (next: SwitchCaseRow[]) => {
      setRows(next);
      onChange(switchCaseRowsToValue(next));
    },
    [onChange]
  );

  const handleAdd = useCallback(() => {
    const id = newRowId();
    emit([...rows, { id, match: '', steps: [] }]);
    setFocusRowId(id);
  }, [emit, rows]);

  const handleMatchChange = useCallback(
    (id: string, match: string) => {
      emit(rows.map((row) => (row.id === id ? { ...row, match } : row)));
    },
    [emit, rows]
  );

  const commitDelete = useCallback(
    (row: SwitchCaseRow) => {
      emit(rows.filter((r) => r.id !== row.id));
      setPendingDelete(null);
    },
    [emit, rows]
  );

  const requestDelete = useCallback(
    (row: SwitchCaseRow) => {
      if (countConfiguredSteps(row.steps) > 0) {
        setPendingDelete(row);
        return;
      }
      commitDelete(row);
    },
    [commitDelete]
  );

  const onDragStart = useCallback(() => {
    setIsReordering(true);
  }, []);

  const onDragUpdate = useCallback<NonNullable<EuiDragDropContextProps['onDragUpdate']>>(
    (update) => {
      const { source, destination } = update;
      if (!source || !destination || destination.index === source.index) {
        setDragOver(null);
        return;
      }
      setDragOver({
        index: destination.index,
        edge: destination.index > source.index ? 'bottom' : 'top',
      });
    },
    []
  );

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      setDragOver(null);
      setIsReordering(false);
      if (!source || !destination || source.index === destination.index) return;
      emit(euiDragDropReorder([...rows], source.index, destination.index));
    },
    [emit, rows]
  );

  const pendingStepCount = pendingDelete ? countConfiguredSteps(pendingDelete.steps) : 0;
  const pendingLabel =
    pendingDelete?.match.trim() ||
    i18n.translate('workflows.switchCasesField.emptyCaseLabel', {
      defaultMessage: '(empty)',
    });

  return (
    <>
      <EuiFormRow
        label={i18n.translate('workflows.switchCasesField.label', {
          defaultMessage: 'Cases',
        })}
        fullWidth
        compressed
      >
        <div
          data-test-subj="workflowSwitchCasesField"
          css={{
            // EUI always mounts the library placeholder as the last droppable
            // child — keep its height for list sizing, but never paint it
            // (otherwise the dashed slot looks stuck at the bottom).
            '& .euiDroppable': {
              display: 'flex',
              flexDirection: 'column',
              gap: euiTheme.size.s,
              borderRadius: 8,
              boxSizing: 'border-box',
              overflow: 'visible',
              backgroundColor: isReordering
                ? transparentize(euiTheme.colors.primary, 0.08)
                : 'transparent',
              padding: isReordering ? 8 : 0,
              transition: `background-color ${euiTheme.animation.fast} ease, padding ${euiTheme.animation.fast} ease`,
            },
            '& .euiDroppable__placeholder > *': {
              opacity: 0,
            },
          }}
        >
          <EuiDragDropContext
            onDragStart={onDragStart}
            onDragUpdate={onDragUpdate}
            onDragEnd={onDragEnd}
          >
            <EuiDroppable
              droppableId={droppableId}
              spacing="none"
              style={{
                // Beat EUI's default green drag fill; keep the list chrome in sync
                // with isReordering so translated rows stay inside the tint.
                backgroundColor: isReordering
                  ? transparentize(euiTheme.colors.primary, 0.08)
                  : undefined,
              }}
            >
              {rows.map((row, index) => {
                const isDuplicate = duplicateIds.has(row.id);
                const showInsertTop =
                  dragOver?.index === index && dragOver.edge === 'top';
                const showInsertBottom =
                  dragOver?.index === index && dragOver.edge === 'bottom';

                // Drawn into the gap rbd opens via transforms — out of flow so
                // we don't stack a second empty row on top of the placeholder.
                const dropSlot = (edge: 'top' | 'bottom') => (
                  <div
                    aria-hidden
                    data-test-subj="workflowSwitchCaseDropSlot"
                    css={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: CASE_FIELD_HEIGHT_PX,
                      boxSizing: 'border-box',
                      borderRadius: euiTheme.border.radius.medium,
                      border: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.primary}`,
                      backgroundColor: transparentize(euiTheme.colors.primary, 0.04),
                      pointerEvents: 'none',
                      zIndex: 1,
                      ...(edge === 'top'
                        ? {
                            top: `calc(-1 * ${euiTheme.size.s} - ${CASE_FIELD_HEIGHT_PX}px)`,
                          }
                        : {
                            bottom: `calc(-1 * ${euiTheme.size.s} - ${CASE_FIELD_HEIGHT_PX}px)`,
                          }),
                    }}
                  />
                );

                return (
                  <EuiDraggable
                    key={row.id}
                    index={index}
                    draggableId={row.id}
                    spacing="none"
                    customDragHandle
                    hasInteractiveChildren
                  >
                    {(provided, snapshot) => (
                      <div
                        css={{
                          position: 'relative',
                          opacity: snapshot.isDragging ? 0.45 : 1,
                          transition: 'opacity 120ms ease',
                          ...(!isReordering
                            ? {
                                '&:hover [data-drag-grip], &:focus-within [data-drag-grip]':
                                  {
                                    width: 16,
                                    minWidth: 16,
                                    opacity: 1,
                                    marginInlineEnd: 6,
                                  },
                              }
                            : {}),
                        }}
                        data-test-subj={`workflowSwitchCaseRow-${index}`}
                      >
                        {showInsertTop ? dropSlot('top') : null}
                        {showInsertBottom ? dropSlot('bottom') : null}
                        <EuiFlexGroup
                          gutterSize="none"
                          alignItems="flexStart"
                          responsive={false}
                        >
                          <span
                            {...provided.dragHandleProps}
                            data-drag-grip
                            css={{
                              cursor: 'grab',
                              display: 'inline-flex',
                              alignItems: 'center',
                              flexShrink: 0,
                              height: 32,
                              width: 0,
                              minWidth: 0,
                              opacity: 0,
                              overflow: 'hidden',
                              marginInlineEnd: 0,
                              transition:
                                'width 150ms ease, opacity 150ms ease, margin 150ms ease',
                              '@media (prefers-reduced-motion: reduce)': {
                                transition: 'none',
                              },
                            }}
                          >
                            <EuiIcon type="drag" color="subdued" size="s" />
                          </span>
                          <EuiFlexItem grow>
                            <EuiFormRow
                              fullWidth
                              compressed
                              isInvalid={isDuplicate}
                              error={
                                isDuplicate
                                  ? i18n.translate(
                                      'workflows.switchCasesField.duplicateWarning',
                                      {
                                        defaultMessage:
                                          'Duplicate value — only the first matching case will run.',
                                      }
                                    )
                                  : undefined
                              }
                            >
                              <EuiFieldText
                                compressed
                                fullWidth
                                value={row.match}
                                isInvalid={isDuplicate}
                                placeholder={i18n.translate(
                                  'workflows.switchCasesField.matchPlaceholder',
                                  { defaultMessage: 'Match value' }
                                )}
                                inputRef={(el) => {
                                  inputRefs.current.set(row.id, el);
                                }}
                                onChange={(e) => handleMatchChange(row.id, e.target.value)}
                                data-test-subj={`workflowSwitchCaseMatch-${index}`}
                                aria-label={i18n.translate(
                                  'workflows.switchCasesField.matchAriaLabel',
                                  {
                                    defaultMessage: 'Case {index} match value',
                                    values: { index: index + 1 },
                                  }
                                )}
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                          {!isReordering ? (
                            <EuiFlexItem grow={false}>
                              <EuiButtonIcon
                                iconType="trash"
                                color="danger"
                                aria-label={i18n.translate(
                                  'workflows.switchCasesField.deleteAriaLabel',
                                  {
                                    defaultMessage: 'Delete case {index}',
                                    values: { index: index + 1 },
                                  }
                                )}
                                onClick={() => requestDelete(row)}
                                data-test-subj={`workflowSwitchCaseDelete-${index}`}
                                css={{
                                  marginTop: 4,
                                  marginInlineStart: euiTheme.size.s,
                                }}
                              />
                            </EuiFlexItem>
                          ) : null}
                        </EuiFlexGroup>
                      </div>
                    )}
                  </EuiDraggable>
                );
              })}
            </EuiDroppable>
          </EuiDragDropContext>

          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('workflows.switchCasesField.helpText', {
                defaultMessage:
                  'Ordered list of match-to-steps mappings. First matching case is executed.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />

          <EuiFlexGroup justifyContent="flexStart" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="both"
                color="primary"
                iconType="plusCircle"
                onClick={handleAdd}
                data-test-subj="workflowSwitchCaseAdd"
              >
                {i18n.translate('workflows.switchCasesField.addCase', {
                  defaultMessage: 'Add case',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFormRow>

      {pendingDelete ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.switchCasesField.deleteTitle', {
            defaultMessage: 'Delete case "{value}"?',
            values: { value: pendingLabel },
          })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => commitDelete(pendingDelete)}
          cancelButtonText={i18n.translate('workflows.switchCasesField.keepCase', {
            defaultMessage: 'Keep case',
          })}
          confirmButtonText={i18n.translate('workflows.switchCasesField.deleteCase', {
            defaultMessage: 'Delete case',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="workflowSwitchCaseDeleteConfirm"
        >
          <EuiText size="s">
            <p>
              {pendingStepCount === 1
                ? i18n.translate('workflows.switchCasesField.deleteBodySingular', {
                    defaultMessage:
                      'This case has 1 configured step underneath it on the canvas. Deleting the case will also remove that step from the workflow.',
                  })
                : i18n.translate('workflows.switchCasesField.deleteBodyPlural', {
                    defaultMessage:
                      'This case has {count} configured steps underneath it on the canvas. Deleting the case will also remove those steps from the workflow.',
                    values: { count: pendingStepCount },
                  })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
        </EuiConfirmModal>
      ) : null}
    </>
  );
}
