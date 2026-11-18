/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldText, EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { useStableCallback } from '@kbn/react-hooks';
import { workflowsEditorChromeOverrides } from '@kbn/workflows-ui';
import { createMonacoSelectionBridge } from './create_monaco_selection_bridge';
import { monacoLanguageFor } from './monaco_language';
import { ReferenceCapableField } from './reference_capable_field';
import { ContainerInSentenceCallout } from './reference_container_callout';
import { ReferenceTextInput } from './reference_text_input';
import { useStepFormReadOnly } from './step_form_read_only_context';
import { caretAfterChange, typedCharacter, useReferenceEditor } from './use_reference_editor';
import type { buildDataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { insertTokenAsJsonText } from '../lib/reference_tokens';
import { type StepFormField } from '../lib/step_form_schema';

const CODE_EDITOR_HEIGHT = 160;

/** Flatten newlines / runs of whitespace for single-line Inputs display only. */
const collapseWhitespaceForDisplay = (text: string): string => text.replace(/\s+/g, ' ');

const canonicalJson = (text: string): string | undefined => {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return undefined;
  }
};

/**
 * Whether the collapsed text, written back, still says what `text` says. JSON may lose the
 * whitespace between its tokens, but not inside a string.
 */
const survivesCollapse = (text: string, isJson: boolean): boolean => {
  const collapsed = collapseWhitespaceForDisplay(text);
  if (collapsed === text) return true;
  if (!isJson) return false;
  const original = canonicalJson(text);
  return original !== undefined && original === canonicalJson(collapsed);
};

/**
 * Templatable code-shaped Inputs field. Inline UI is always a single-line
 * `EuiFieldText` (whitespace-collapsed for display); multi-line editing is the
 * expand sub-flyout. ES|QL keeps its specialized Monaco editor (`// TODO(slice7)`).
 * JSON fields still round-trip through parse; invalid drafts stay local.
 */
export function CodeField({
  field,
  value,
  catalog,
  onChange,
  testSubj,
  isInvalid,
  onBlur,
  onDraftErrorChange,
  onExpand,
  fixedOnly = false,
}: {
  field: StepFormField;
  value: unknown;
  catalog: ReturnType<typeof buildDataReferenceCatalog>;
  onChange: (value: unknown) => void;
  testSubj: string;
  isInvalid: boolean;
  onBlur: () => void;
  onDraftErrorChange: (error: string | undefined) => void;
  onExpand?: () => void;
  /** The engine reads this value exactly as typed: no picker, no references. */
  fixedOnly?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const readOnly = useStepFormReadOnly();
  const isJson = field.language === 'json';
  const isEsql = field.language === 'esql';
  const isJsonLiquid = field.language === 'json-liquid';
  // These keep their text exactly as typed, in an inline Monaco editor.
  const usesInlineMonaco = isEsql || isJsonLiquid;
  const controlPaddingPx = parseInt(String(euiTheme.size.m), 10);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [editorHeight, setEditorHeight] = useState(CODE_EDITOR_HEIGHT);

  const external = useMemo(() => {
    if (value === undefined || value === null) return '';
    if ((isJson || isJsonLiquid) && typeof value !== 'string')
      return JSON.stringify(value, null, 2);
    return String(value);
  }, [value, isJson, isJsonLiquid]);

  // Inline Inputs show a whitespace-collapsed string. Where writing that back would change the
  // value (a multi-line text, a JSON string with runs of spaces), the field is a preview that
  // opens the expanded editor instead, so no edit rewrites what the user did not touch.
  const editsInExpanded = useMemo(
    () => !usesInlineMonaco && onExpand !== undefined && !survivesCollapse(external, isJson),
    [usesInlineMonaco, onExpand, external, isJson]
  );
  const [draft, setDraft] = useState(() =>
    usesInlineMonaco ? external : collapseWhitespaceForDisplay(external)
  );

  // The parent hands a new `onDraftErrorChange` on every render; only a new value resets the draft.
  const clearDraftError = useStableCallback(() => onDraftErrorChange(undefined));
  useEffect(() => {
    setDraft((typed) => {
      if (usesInlineMonaco) return external;
      // The parent echoes valid JSON back re-formatted; keep what the user typed, not the echo.
      const typedJson = isJson ? canonicalJson(typed) : undefined;
      if (typedJson !== undefined && typedJson === canonicalJson(external)) return typed;
      return collapseWhitespaceForDisplay(external);
    });
    clearDraftError();
  }, [external, usesInlineMonaco, isJson, clearDraftError]);

  const {
    chipCss,
    captureEditor,
    warning: containerWarning,
    dismissWarning,
  } = useReferenceEditor({
    // Only the inline Monaco editors draw chips here; the other inputs bring their own.
    text: usesInlineMonaco ? draft : '',
    catalog,
    warnContainersInSentence: isJsonLiquid,
  });

  useEffect(() => {
    if (!usesInlineMonaco) return;
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;
    const syncHeight = () => {
      setEditorHeight(Math.max(CODE_EDITOR_HEIGHT, Math.floor(shell.clientHeight)));
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [usesInlineMonaco]);

  const jsonParseError = i18n.translate('workflows.stepConfigPanel.validation.mustBeJson', {
    defaultMessage: 'Must be valid JSON',
  });

  const applyDraft = useCallback(
    (text: string) => {
      setDraft(text);
      if (!isJson) {
        onDraftErrorChange(undefined);
        onChange(text);
        return;
      }
      if (text.trim() === '') {
        onDraftErrorChange(undefined);
        onChange(undefined);
        return;
      }
      try {
        onChange(JSON.parse(text));
        onDraftErrorChange(undefined);
      } catch {
        // Keep the last valid value in the fragment; surface draft error for FormRow.
        onDraftErrorChange(jsonParseError);
      }
    },
    [isJson, jsonParseError, onChange, onDraftErrorChange]
  );

  // A preview has no editor, so only the picker writes here, and it appends to the shown text:
  // append to the original instead of to its collapsed copy.
  const appendToOriginal = useCallback(
    (next: string) => {
      if (next.startsWith(draft)) applyDraft(external + next.slice(draft.length));
    },
    [applyDraft, draft, external]
  );

  // TODO(slice7): ES|QL keeps its specialized editor — no single-line collapse.
  if (usesInlineMonaco) {
    return (
      <ReferenceCapableField
        catalog={catalog}
        value={draft}
        onChange={applyDraft}
        onExpand={onExpand}
        anchorAtCaret
        valueFormWhenWhole={field.valueFormWhenWhole}
      >
        {({ teachingPlaceholder, appendControls, reportChange, registerSelection }) => (
          <>
            <div
              ref={shellRef}
              onBlur={onBlur}
              css={{
                position: 'relative',
                height: CODE_EDITOR_HEIGHT,
                minHeight: CODE_EDITOR_HEIGHT,
                resize: 'vertical',
                overflow: 'hidden',
                border: `${euiTheme.border.width.thin} solid ${
                  isInvalid ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBasePlain
                }`,
                borderRadius: euiTheme.border.radius.small,
                background: euiTheme.colors.backgroundBaseSubdued,
                boxSizing: 'border-box',
                ...chipCss,
              }}
              data-test-subj={testSubj}
              data-language={field.language}
              aria-invalid={isInvalid}
            >
              <div
                css={{
                  position: 'absolute',
                  top: euiTheme.size.m,
                  right: euiTheme.size.m,
                  zIndex: 2,
                }}
              >
                {appendControls}
              </div>
              <CodeEditor
                languageId={monacoLanguageFor(field.language)}
                chromeOverrides={workflowsEditorChromeOverrides}
                value={draft}
                onChange={(text, event) =>
                  reportChange(text, caretAfterChange(text, event), typedCharacter(event))
                }
                height={editorHeight}
                aria-label={field.label}
                placeholder={draft.length === 0 ? teachingPlaceholder : undefined}
                editorDidMount={(editor) => {
                  registerSelection(
                    createMonacoSelectionBridge(editor, () => editor.getValue().length)
                  );
                  captureEditor(editor);
                }}
                options={{
                  readOnly,
                  automaticLayout: true,
                  fontSize: 12,
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  lineNumbersMinChars: 0,
                  glyphMargin: false,
                  folding: false,
                  padding: { top: controlPaddingPx, bottom: controlPaddingPx },
                  lineDecorationsWidth: controlPaddingPx,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  scrollbar: { vertical: 'auto', horizontal: 'hidden' },
                  // Typed braces are the picker's `{{` trigger: auto-closing would leave a stray `}}`.
                  ...(isJsonLiquid
                    ? {
                        autoClosingBrackets: 'never',
                        autoClosingQuotes: 'never',
                        autoSurround: 'never',
                      }
                    : {}),
                }}
              />
            </div>
            {containerWarning ? (
              <ContainerInSentenceCallout
                token={containerWarning}
                onFix={() => applyDraft(insertTokenAsJsonText(draft, containerWarning))}
                onDismiss={dismissWarning}
                testSubj={testSubj}
              />
            ) : null}
          </>
        )}
      </ReferenceCapableField>
    );
  }

  if (fixedOnly) {
    return (
      <EuiFieldText
        compressed
        fullWidth
        isInvalid={isInvalid}
        value={draft}
        readOnly={editsInExpanded}
        onChange={(e) => applyDraft(e.target.value)}
        onClick={editsInExpanded ? onExpand : undefined}
        onKeyDown={(e) => {
          if (editsInExpanded && e.key === 'Enter') onExpand?.();
        }}
        onBlur={onBlur}
        append={<EuiIcon type="lock" aria-hidden />}
        data-test-subj={testSubj}
        data-language={field.language}
      />
    );
  }

  return (
    <ReferenceCapableField
      catalog={catalog}
      value={draft}
      onChange={editsInExpanded ? appendToOriginal : applyDraft}
      onExpand={onExpand}
      openOnBrace={field.language === 'plaintext'}
      valueFormWhenWhole={field.valueFormWhenWhole}
    >
      {(bind) => (
        <ReferenceTextInput
          bind={bind}
          catalog={catalog}
          ariaLabel={field.label}
          isInvalid={isInvalid}
          onBlur={onBlur}
          onChange={bind.reportChange}
          testSubj={testSubj}
          warnContainersInSentence={field.language === 'plaintext'}
          language={field.language}
          onEditRequest={editsInExpanded ? onExpand : undefined}
        />
      )}
    </ReferenceCapableField>
  );
}
