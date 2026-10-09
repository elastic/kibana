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
  EuiFormLabel,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataReferenceCatalogTree } from './data_reference_catalog_tree';
import { ReferenceCapableField } from './reference_capable_field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

export interface FieldEditorSubFlyoutProps {
  readonly fieldLabel: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly catalog: DataReferenceCatalog;
  /** Monaco language when using the code editor; omit for plain text. */
  readonly language?: 'json' | 'esql' | 'kuery' | 'plaintext' | 'yaml';
  /** Close this panel only (Back / Escape / history pop). */
  readonly onBack: () => void;
  /** Close the whole step-config stack (header ✕). */
  readonly onCloseStack: () => void;
}

const VALUE_LABEL = i18n.translate('workflows.fieldEditorSubFlyout.valueLabel', {
  defaultMessage: 'Value',
});

const MAX_DRAFT_HISTORY = 200;

interface DraftHistory {
  stack: string[];
  index: number;
}

const createDraftHistory = (initial: string): DraftHistory => ({
  stack: [initial],
  index: 0,
});

/**
 * Expanded field editor stacked inside the canvas-bounded step panel.
 * Live write-through to the step working state — no save/cancel of its own.
 */
export function FieldEditorSubFlyout({
  fieldLabel,
  value,
  onChange,
  catalog,
  onBack,
  onCloseStack,
}: FieldEditorSubFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'workflowFieldEditorTitle' });
  const valueLabelId = useGeneratedHtmlId({ prefix: 'workflowFieldEditorValue' });
  const [draft, setDraft] = useState(value);
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragOverRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const caretRef = useRef(value.length);
  const focusedOnceRef = useRef(false);
  const dragOverCaretRafRef = useRef<number | null>(null);
  const dragOverPointerRef = useRef({ x: 0, y: 0 });
  const editorFocusedForDragRef = useRef(false);
  /** Scoped undo/redo — controlled React value resets the browser textarea stack. */
  const draftHistoryRef = useRef<DraftHistory>(createDraftHistory(value));

  // Same kbd chip style as the inline data-reference picker footer.
  const keyChipCss = {
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

  // Sync when the parent field value changes from outside (not every keystroke
  // source — parent should push the same string we already wrote).
  useEffect(() => {
    setDraft((prev) => {
      if (prev === value) return prev;
      draftHistoryRef.current = createDraftHistory(value);
      caretRef.current = value.length;
      return value;
    });
  }, [value]);

  // Focus the editor on open with the caret at the end.
  useEffect(() => {
    if (focusedOnceRef.current) return;
    focusedOnceRef.current = true;
    window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
      caretRef.current = end;
    });
  }, []);

  const recordDraftHistory = useCallback((next: string) => {
    const history = draftHistoryRef.current;
    if (history.stack[history.index] === next) return;
    const stack = history.stack.slice(0, history.index + 1);
    stack.push(next);
    while (stack.length > MAX_DRAFT_HISTORY) {
      stack.shift();
    }
    draftHistoryRef.current = { stack, index: stack.length - 1 };
  }, []);

  const applyDraft = useCallback(
    (next: string, caret?: number, options?: { readonly recordHistory?: boolean }) => {
      if (options?.recordHistory !== false) {
        recordDraftHistory(next);
      }
      setDraft(next);
      if (caret !== undefined) caretRef.current = caret;
      onChange(next);
    },
    [onChange, recordDraftHistory]
  );

  const restoreDraftFromHistory = useCallback(
    (next: string) => {
      const caret = next.length;
      applyDraft(next, caret, { recordHistory: false });
      window.requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [applyDraft]
  );

  const undoDraft = useCallback(() => {
    const history = draftHistoryRef.current;
    if (history.index <= 0) return;
    history.index -= 1;
    restoreDraftFromHistory(history.stack[history.index]);
  }, [restoreDraftFromHistory]);

  const redoDraft = useCallback(() => {
    const history = draftHistoryRef.current;
    if (history.index >= history.stack.length - 1) return;
    history.index += 1;
    restoreDraftFromHistory(history.stack[history.index]);
  }, [restoreDraftFromHistory]);

  const insertAtOffset = useCallback(
    (token: string, offset: number) => {
      const start = Math.max(0, Math.min(offset, draft.length));
      const next = `${draft.slice(0, start)}${token}${draft.slice(start)}`;
      const nextCaret = start + token.length;
      applyDraft(next, nextCaret);
      window.requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [applyDraft, draft]
  );

  const insertAtCaret = useCallback(
    (token: string) => {
      insertAtOffset(token, caretRef.current);
    },
    [insertAtOffset]
  );

  const caretFromPointer = useCallback(
    (clientX: number, clientY: number, el: HTMLTextAreaElement): number => {
      // Approximate drop caret from pointer position within a monospace-ish
      // textarea. Good enough for JSON / text; click-to-insert remains exact.
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || 20;
      const fontSize = parseFloat(style.fontSize) || 13;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const approxLine = Math.max(
        0,
        Math.floor((clientY - rect.top - paddingTop + el.scrollTop) / lineHeight)
      );
      const approxCol = Math.max(
        0,
        Math.floor((clientX - rect.left - paddingLeft + el.scrollLeft) / (fontSize * 0.55))
      );
      const lines = draft.split('\n');
      let offset = 0;
      for (let i = 0; i < Math.min(approxLine, lines.length); i++) {
        offset += lines[i].length + (i < lines.length - 1 ? 1 : 0);
      }
      if (approxLine < lines.length) {
        offset += Math.min(approxCol, lines[approxLine].length);
      }
      return Math.min(offset, draft.length);
    },
    [draft]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onBack();
        return;
      }

      // Keep Cmd/Ctrl+Z (and redo) inside this editor — never the canvas / YAML.
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) redoDraft();
        else undoDraft();
        return;
      }
      if (key === 'y') {
        e.preventDefault();
        e.stopPropagation();
        redoDraft();
      }
    },
    [onBack, redoDraft, undoDraft]
  );

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-label={fieldLabel}
      data-test-subj="workflowFieldEditorSubFlyout"
      onKeyDown={handleKeyDown}
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: euiTheme.colors.backgroundBasePlain,
      }}
    >
      <div
        css={{
          flex: '0 0 auto',
          borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
          padding: euiTheme.size.m,
          display: 'flex',
          flexDirection: 'column',
          gap: euiTheme.size.s,
        }}
      >
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="left"
              color="text"
              iconType="undo"
              onClick={onBack}
              data-test-subj="workflowFieldEditorSubFlyoutBack"
            >
              {i18n.translate('workflows.fieldEditorSubFlyout.back', {
                defaultMessage: 'Back',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={i18n.translate('workflows.fieldEditorSubFlyout.closeStack', {
                defaultMessage: 'Close',
              })}
              onClick={onCloseStack}
              data-test-subj="workflowFieldEditorSubFlyoutClose"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiTitle size="xs">
          <h4 id={titleId} data-test-subj="workflowFieldEditorSubFlyoutTitle">
            {fieldLabel}
          </h4>
        </EuiTitle>
      </div>

      <div
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          css={{
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
          }}
        >
          <DataReferenceCatalogTree catalog={catalog} onInsert={insertAtCaret} />

          <div
            data-test-subj="workflowFieldEditorSubFlyoutEditorPane"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              // Avoid setState on every dragover — continuous re-renders make
              // the custom drag ghost stutter while crossing into the editor.
              if (!isDragOverRef.current) {
                isDragOverRef.current = true;
                setIsDragOver(true);
              }
              const el = textareaRef.current;
              if (!el) return;
              dragOverPointerRef.current = { x: e.clientX, y: e.clientY };
              if (dragOverCaretRafRef.current != null) return;
              dragOverCaretRafRef.current = window.requestAnimationFrame(() => {
                dragOverCaretRafRef.current = null;
                const target = textareaRef.current;
                if (!target) return;
                const { x, y } = dragOverPointerRef.current;
                const offset = caretFromPointer(x, y, target);
                caretRef.current = offset;
                if (!editorFocusedForDragRef.current) {
                  editorFocusedForDragRef.current = true;
                  target.focus({ preventScroll: true });
                }
                target.setSelectionRange(offset, offset);
              });
            }}
            onDragLeave={(e) => {
              // Ignore leave events that stay within the pane.
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              isDragOverRef.current = false;
              editorFocusedForDragRef.current = false;
              if (dragOverCaretRafRef.current != null) {
                window.cancelAnimationFrame(dragOverCaretRafRef.current);
                dragOverCaretRafRef.current = null;
              }
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              isDragOverRef.current = false;
              editorFocusedForDragRef.current = false;
              if (dragOverCaretRafRef.current != null) {
                window.cancelAnimationFrame(dragOverCaretRafRef.current);
                dragOverCaretRafRef.current = null;
              }
              setIsDragOver(false);
              const token = e.dataTransfer.getData('text/plain');
              if (!token) return;
              const el = textareaRef.current;
              if (!el) {
                insertAtCaret(token);
                return;
              }
              const offset = caretFromPointer(e.clientX, e.clientY, el);
              insertAtOffset(token, offset);
            }}
            css={{
              flex: '1 1 auto',
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: euiTheme.size.s,
              padding: euiTheme.size.m,
              // Prefer a text caret over the default DnD pointer while hovering
              // the editor — reinforces the insertion-point affordance.
              cursor: isDragOver ? 'text' : undefined,
              // TODO(preview): needs last-run execution data — reserve a third
              // pane here later without reflowing the tree + editor.
            }}
          >
            <div
              css={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'baseline',
                gap: euiTheme.size.s,
                flexWrap: 'wrap',
              }}
            >
              <EuiFormLabel
                id={valueLabelId}
                data-test-subj="workflowFieldEditorSubFlyoutValueLabel"
              >
                {VALUE_LABEL}
              </EuiFormLabel>
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="workflowFieldEditorSubFlyoutValueDescription"
                css={{ '& kbd': keyChipCss }}
              >
                <FormattedMessage
                  id="workflows.fieldEditorSubFlyout.valueDescription"
                  defaultMessage="Drag a reference in, or type {at} / {braces}"
                  values={{
                    at: <kbd>@</kbd>,
                    braces: <kbd>{'{{'}</kbd>,
                  }}
                />
              </EuiText>
            </div>

            <div
              css={{
                flex: '1 1 auto',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                // Stretch ReferenceCapableField / DataReferencePicker fill wrapper.
                '& > *': {
                  flex: '1 1 auto',
                  minHeight: 0,
                  height: '100%',
                },
              }}
            >
              <ReferenceCapableField
                catalog={catalog}
                value={draft}
                onChange={applyDraft}
                fillHeight
              >
                {({ appendControls, reportChange, attachInputRef, isOpen }) => (
                  <div
                    css={{
                      flex: '1 1 auto',
                      minHeight: 0,
                      height: '100%',
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    <div
                      css={{
                        position: 'absolute',
                        top: euiTheme.size.s,
                        right: euiTheme.size.s,
                        zIndex: 2,
                      }}
                    >
                      {appendControls}
                    </div>
                    <textarea
                      ref={(el) => {
                        textareaRef.current = el;
                        attachInputRef(el);
                      }}
                      value={draft}
                      aria-labelledby={valueLabelId}
                      aria-expanded={isOpen}
                      data-test-subj="workflowFieldEditorSubFlyoutTextarea"
                      onChange={(e) => {
                        const next = e.target.value;
                        const caret = e.target.selectionStart ?? next.length;
                        caretRef.current = caret;
                        reportChange(next, caret);
                      }}
                      onSelect={(e) => {
                        caretRef.current = e.currentTarget.selectionStart ?? draft.length;
                      }}
                      onClick={(e) => {
                        caretRef.current = e.currentTarget.selectionStart ?? draft.length;
                      }}
                      css={{
                        // Absolute fill — textarea flex growth is unreliable across browsers.
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        boxSizing: 'border-box',
                        padding: euiTheme.size.m,
                        paddingRight: 56,
                        cursor: isDragOver ? 'text' : undefined,
                        // Primary blue drop caret so the insertion point reads
                        // clearly against the draft text while dragging.
                        caretColor: isDragOver
                          ? euiTheme.colors.primary
                          : euiTheme.colors.textParagraph,
                        border: `${euiTheme.border.width.thin} solid ${
                          isDragOver
                            ? euiTheme.colors.borderStrongPrimary
                            : euiTheme.colors.borderBasePlain
                        }`,
                        borderRadius: euiTheme.border.radius.small,
                        background: euiTheme.colors.backgroundBaseSubdued,
                        color: euiTheme.colors.textParagraph,
                        fontFamily: euiTheme.font.familyCode,
                        fontSize: 13,
                        lineHeight: 1.5,
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </ReferenceCapableField>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
