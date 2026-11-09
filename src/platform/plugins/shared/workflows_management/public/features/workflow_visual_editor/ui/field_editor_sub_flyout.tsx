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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import type { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { XJSON_LANG_ID } from '@kbn/monaco';
import { workflowsEditorChromeOverrides } from '@kbn/workflows-ui';
import { createMonacoSelectionBridge } from './create_monaco_selection_bridge';
import type { DataReferenceRunControls } from './data_reference_catalog_tree';
import { DataReferenceCatalogTree } from './data_reference_catalog_tree';
import { ensureJsonLiquidLanguage, JSON_LIQUID_LANG_ID } from './json_liquid_language';
import { ReferenceCapableField } from './reference_capable_field';
import type { ReferenceSelectionBridge } from './reference_capable_field';
import { ContainerInSentenceCallout } from './reference_container_callout';
import {
  getReferenceChipEditorCss,
  useReferenceDecorations,
  useReferenceIconMasks,
} from './use_reference_decorations';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { findReferenceTokens, insertTokenAsJsonText } from '../lib/reference_tokens';
import { tokenForInsert } from '../lib/reference_value';

type Editor = monaco.editor.IStandaloneCodeEditor;

const monacoLanguageFor = (language: FieldEditorSubFlyoutProps['language']): string => {
  switch (language) {
    case 'json':
      return XJSON_LANG_ID;
    case 'json-liquid':
      ensureJsonLiquidLanguage();
      return JSON_LIQUID_LANG_ID;
    default:
      return 'plaintext';
  }
};

export interface FieldEditorSubFlyoutProps {
  readonly fieldLabel: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly catalog: DataReferenceCatalog;
  /** Run controls and data for the step rows of the reference tree; omit to hide them. */
  readonly runControls?: DataReferenceRunControls;
  /** Monaco language when using the code editor; omit for plain text. */
  readonly language?: 'json' | 'esql' | 'kuery' | 'plaintext' | 'yaml' | 'json-liquid';
  /** A pick that fills the whole editor is inserted as a value (`${{ }}`); see `ReferenceCapableField`. */
  readonly valueFormWhenWhole?: boolean;
  /** Close this panel only (Back / Escape / history pop). */
  readonly onBack: () => void;
  /** Close the whole step-config stack (header ✕). */
  readonly onCloseStack: () => void;
}

const VALUE_LABEL = i18n.translate('workflows.fieldEditorSubFlyout.valueLabel', {
  defaultMessage: 'Value',
});

const EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontSize: 13,
  minimap: { enabled: false },
  lineNumbers: 'off',
  lineNumbersMinChars: 0,
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 0,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  renderLineHighlight: 'none',
  overviewRulerLanes: 0,
  scrollbar: { vertical: 'auto', horizontal: 'hidden' },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  // Typed braces and quotes are plain text here: auto-closing `{` into `{}` would also hide
  // the trigger the picker listens for.
  autoClosingBrackets: 'never',
  autoClosingQuotes: 'never',
  autoSurround: 'never',
  formatOnType: false,
  formatOnPaste: false,
  // Drops from the reference tree are inserted by the pane (exact position, once); Monaco's
  // own drop handling would insert a second copy.
  dropIntoEditor: { enabled: false },
};

/**
 * Expanded field editor stacked inside the canvas-bounded step panel.
 * Live write-through to the step working state — no save/cancel of its own.
 */
export function FieldEditorSubFlyout({
  fieldLabel,
  value,
  onChange,
  catalog,
  runControls,
  language,
  valueFormWhenWhole = false,
  onBack,
  onCloseStack,
}: FieldEditorSubFlyoutProps) {
  const { euiTheme, colorMode } = useEuiTheme();
  const masks = useReferenceIconMasks();
  const titleId = useGeneratedHtmlId({ prefix: 'workflowFieldEditorTitle' });
  const valueLabelId = useGeneratedHtmlId({ prefix: 'workflowFieldEditorValue' });
  const [draft, setDraft] = useState(value);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragOverRef = useRef(false);
  const bridgeRef = useRef<ReferenceSelectionBridge | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dragOverCaretRafRef = useRef<number | null>(null);
  const dragOverPointerRef = useRef({ x: 0, y: 0 });
  const editorFocusedForDragRef = useRef(false);

  // `{` is syntax in JSON and KQL, so only free text gets the `{` trigger and the "list inside a
  // sentence" warning (same rule as the inline fields).
  const isFreeText = language === undefined || language === 'plaintext';
  const tokens = useMemo(
    () =>
      findReferenceTokens(draft, {
        catalog,
        warnContainersInSentence: isFreeText || language === 'json-liquid',
        quotedStringsAreValues: language === 'json',
      }),
    [catalog, draft, isFreeText, language]
  );
  useReferenceDecorations(editor, draft, tokens);
  const warning = tokens.find(
    (token) => token.isContainerInSentence && !dismissed.has(token.expression)
  );

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
    setDraft((prev) => (prev === value ? prev : value));
  }, [value]);

  const applyDraft = useCallback(
    (next: string) => {
      setDraft(next);
      onChange(next);
    },
    [onChange]
  );

  // Reference tree click-to-insert: at the editor's caret, as an undoable edit.
  const insertAtCaret = useCallback(
    (picked: string) => {
      const bridge = bridgeRef.current;
      if (!bridge) {
        const end = draftRef.current.length;
        applyDraft(
          `${draftRef.current}${tokenForInsert(
            picked,
            draftRef.current,
            end,
            end,
            valueFormWhenWhole
          )}`
        );
        return;
      }
      const caret = bridge.getCaret();
      bridge.replaceText?.(
        caret,
        caret,
        tokenForInsert(picked, draftRef.current, caret, caret, valueFormWhenWhole)
      );
    },
    [applyDraft, valueFormWhenWhole]
  );

  const handleEditorMount = useCallback(
    (mounted: Editor, registerSelection: (bridge: ReferenceSelectionBridge) => void) => {
      const bridge = createMonacoSelectionBridge(mounted, () => draftRef.current.length);
      bridgeRef.current = bridge;
      registerSelection(bridge);
      setEditor((current) => current ?? mounted);
      // Open focused, with the caret at the end.
      bridge.setCaret(draftRef.current.length);
    },
    []
  );

  const offsetAtPointer = useCallback(
    (clientX: number, clientY: number): number | undefined => {
      const position = editor?.getTargetAtClientPoint(clientX, clientY)?.position;
      const model = editor?.getModel();
      return position && model ? model.getOffsetAt(position) : undefined;
    },
    [editor]
  );

  const cancelDragFrame = () => {
    if (dragOverCaretRafRef.current != null) {
      window.cancelAnimationFrame(dragOverCaretRafRef.current);
      dragOverCaretRafRef.current = null;
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onBack();
        return;
      }

      // The editor owns Cmd/Ctrl+Z (and redo) through its own undo stack; keep those keys
      // inside it — never the canvas / YAML.
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.stopPropagation();
      }
    },
    [onBack]
  );

  const editorBoxCss = {
    position: 'absolute',
    inset: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    cursor: isDragOver ? 'text' : undefined,
    border: `${euiTheme.border.width.thin} solid ${
      isDragOver ? euiTheme.colors.borderStrongPrimary : euiTheme.colors.borderBasePlain
    }`,
    borderRadius: euiTheme.border.radius.small,
    background: euiTheme.colors.backgroundBaseSubdued,
    // Transparent so the box (border, background) shows through.
    '.monaco-editor, .monaco-editor-background, .monaco-editor .margin': {
      backgroundColor: 'transparent',
    },
    ...getReferenceChipEditorCss(euiTheme, masks, colorMode),
  } as const;
  const editorPaddingPx = parseInt(String(euiTheme.size.m), 10) || 12;

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
          <DataReferenceCatalogTree catalog={catalog} onInsert={insertAtCaret} {...runControls} />

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
              if (!editor) return;
              dragOverPointerRef.current = { x: e.clientX, y: e.clientY };
              if (dragOverCaretRafRef.current != null) return;
              dragOverCaretRafRef.current = window.requestAnimationFrame(() => {
                dragOverCaretRafRef.current = null;
                const { x, y } = dragOverPointerRef.current;
                const offset = offsetAtPointer(x, y);
                if (offset === undefined) return;
                if (!editorFocusedForDragRef.current) {
                  editorFocusedForDragRef.current = true;
                  editor.focus();
                }
                bridgeRef.current?.setCaret(offset);
              });
            }}
            onDragLeave={(e) => {
              // Ignore leave events that stay within the pane.
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              isDragOverRef.current = false;
              editorFocusedForDragRef.current = false;
              cancelDragFrame();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              isDragOverRef.current = false;
              editorFocusedForDragRef.current = false;
              cancelDragFrame();
              setIsDragOver(false);
              const token = e.dataTransfer.getData('text/plain');
              if (!token) return;
              const offset = offsetAtPointer(e.clientX, e.clientY);
              if (offset === undefined) {
                insertAtCaret(token);
                return;
              }
              bridgeRef.current?.replaceText?.(
                offset,
                offset,
                tokenForInsert(token, draftRef.current, offset, offset, valueFormWhenWhole)
              );
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
                openOnBrace={isFreeText}
                valueFormWhenWhole={valueFormWhenWhole}
              >
                {({ appendControls, reportChange, registerSelection, teachingPlaceholder }) => (
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
                    <div css={editorBoxCss}>
                      <CodeEditor
                        languageId={monacoLanguageFor(language)}
                        chromeOverrides={workflowsEditorChromeOverrides}
                        value={draft}
                        onChange={(text, event) => {
                          const last = event?.changes?.[event.changes.length - 1];
                          const caret = last ? last.rangeOffset + last.text.length : text.length;
                          reportChange(text, Math.min(caret, text.length));
                        }}
                        height="100%"
                        aria-label={fieldLabel}
                        dataTestSubj="workflowFieldEditorSubFlyoutTextarea"
                        placeholder={draft.length === 0 ? teachingPlaceholder : undefined}
                        editorDidMount={(mounted) => handleEditorMount(mounted, registerSelection)}
                        options={{
                          ...EDITOR_OPTIONS,
                          padding: { top: editorPaddingPx, bottom: editorPaddingPx },
                          lineDecorationsWidth: editorPaddingPx,
                        }}
                      />
                    </div>
                  </div>
                )}
              </ReferenceCapableField>
            </div>
            {warning ? (
              <div css={{ flex: '0 0 auto' }}>
                <ContainerInSentenceCallout
                  token={warning}
                  onFix={() => applyDraft(insertTokenAsJsonText(draft, warning))}
                  onDismiss={() =>
                    setDismissed((current) => new Set(current).add(warning.expression))
                  }
                  testSubj="workflowFieldEditorSubFlyout"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
