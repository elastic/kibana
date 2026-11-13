/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import type { monaco } from '@kbn/code-editor';
import { workflowsEditorChromeOverrides } from '@kbn/workflows-ui';
import { createMonacoSelectionBridge } from './create_monaco_selection_bridge';
import type { ReferenceCapableBind } from './reference_capable_field';
import { ReferenceChip } from './reference_chip';
import { ContainerInSentenceCallout } from './reference_container_callout';
import { caretAfterChange, useReferenceEditor } from './use_reference_editor';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import type { ReferenceToken } from '../lib/reference_tokens';
import { insertTokenAsJsonText } from '../lib/reference_tokens';

type Editor = monaco.editor.IStandaloneCodeEditor;

/** Where the caret goes once the editor has mounted. */
type Pending =
  | { readonly kind: 'end' }
  | { readonly kind: 'caret'; readonly offset: number }
  | { readonly kind: 'token'; readonly start: number; readonly end: number };

const EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontSize: 12,
  minimap: { enabled: false },
  lineNumbers: 'off',
  lineNumbersMinChars: 0,
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 0,
  scrollBeyondLastLine: false,
  wordWrap: 'off',
  renderLineHighlight: 'none',
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  scrollbar: { vertical: 'hidden', horizontal: 'hidden', alwaysConsumeMouseWheel: false },
  contextmenu: false,
  occurrencesHighlight: 'off',
  matchBrackets: 'never',
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  tabFocusMode: true,
  lineHeight: 18,
  // Typed braces and quotes are plain text here: auto-closing `{` into `{}` would also hide
  // the trigger the picker listens for.
  autoClosingBrackets: 'never',
  autoClosingQuotes: 'never',
  autoSurround: 'never',
  autoIndent: 'none',
  formatOnType: false,
  formatOnPaste: false,
};

/** Browser text position under a pointer, as a node + offset. */
const textPositionAt = (x: number, y: number): { node: Node; offset: number } | undefined => {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : undefined;
};

/**
 * Single-line text input that draws `{{ }}` / `${{ }}` references as chips. At rest it is a
 * read view (cheap with many rows, chips carry accessible names); a click, or Tab, mounts a
 * single-line Monaco editor where the chips stay styled text. Rendered as the child of
 * `ReferenceCapableField`, which owns the picker.
 */
export function ReferenceTextInput({
  bind,
  catalog,
  ariaLabel,
  isInvalid,
  onBlur,
  onChange,
  testSubj,
  warnContainersInSentence,
  language,
}: {
  readonly bind: ReferenceCapableBind;
  readonly catalog: DataReferenceCatalog;
  readonly ariaLabel: string;
  readonly isInvalid: boolean;
  readonly onBlur: () => void;
  /** Text edits; wired to `bind.reportChange` so typed triggers open the picker. */
  readonly onChange: (next: string, caret: number) => void;
  readonly testSubj: string;
  /** Flag a known list or record inside a sentence (free text only). */
  readonly warnContainersInSentence: boolean;
  /** Reflected as `data-language` so the field's kind stays inspectable. */
  readonly language?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  const { value, isOpen, appendControls, registerSelection, openPickerAtRange } = bind;
  const [isEditing, setIsEditing] = useState(false);
  const pendingRef = useRef<Pending | undefined>({ kind: 'end' });
  const heightPx = parseInt(String(euiTheme.size.xl), 10) || 32;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const valueRef = useRef(value);
  valueRef.current = value;
  // The editor registers its blur listener once, at mount; it must still call the latest handler.
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const { tokens, chipCss, captureEditor, releaseEditor, warning, dismissWarning } =
    useReferenceEditor({
      text: value,
      catalog,
      warnContainersInSentence,
      quotedStringsAreValues: language === 'json',
    });

  const startEditing = useCallback((pending: Pending) => {
    pendingRef.current = pending;
    setIsEditing(true);
  }, []);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    releaseEditor();
    registerSelection(null);
  }, [registerSelection, releaseEditor]);

  // Mousedown only keeps focus on the read view; the action runs on click, once the pointer is
  // released. Opening the picker earlier lets the trailing click count as an "outside click"
  // and close it straight away.
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a')) return;
    event.preventDefault();
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    // Let the append buttons (and anything else interactive) behave normally.
    if (target.closest('button, a')) return;
    const chip = target.closest<HTMLElement>('[data-ref-start]');
    if (chip) {
      startEditing({
        kind: 'token',
        start: Number(chip.dataset.refStart),
        end: Number(chip.dataset.refEnd),
      });
      return;
    }
    const position = textPositionAt(event.clientX, event.clientY);
    const run = position
      ? (position.node.parentElement ?? undefined)?.closest<HTMLElement>('[data-run-offset]')
      : undefined;
    startEditing(
      position && run
        ? { kind: 'caret', offset: Number(run.dataset.runOffset) + position.offset }
        : { kind: 'end' }
    );
  };

  const handleEditorMount = useCallback(
    (mounted: Editor) => {
      const model = mounted.getModel();
      const clamp = (offset: number) => Math.max(0, Math.min(offset, model?.getValueLength() ?? 0));
      const bridge = createMonacoSelectionBridge(mounted, () => valueRef.current.length);
      registerSelection(bridge);
      // A single-line field: Enter does nothing.
      mounted.onKeyDown((event) => {
        if (event.browserEvent.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
        }
      });
      mounted.onDidBlurEditorText(() => {
        if (isOpenRef.current) return;
        onBlurRef.current();
        stopEditing();
      });
      captureEditor(mounted);

      // Position the caret once, for the interaction that mounted the editor.
      const pending = pendingRef.current;
      pendingRef.current = undefined;
      if (!pending) return;
      if (pending.kind === 'token') {
        mounted.focus();
        if (model) {
          const from = model.getPositionAt(clamp(pending.start));
          const to = model.getPositionAt(clamp(pending.end));
          mounted.setSelection({
            startLineNumber: from.lineNumber,
            startColumn: from.column,
            endLineNumber: to.lineNumber,
            endColumn: to.column,
          });
        }
        openPickerAtRange(pending.start, pending.end);
        return;
      }
      bridge.setCaret(pending.kind === 'caret' ? pending.offset : valueRef.current.length);
    },
    [captureEditor, openPickerAtRange, registerSelection, stopEditing]
  );

  const boxCss = {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    inlineSize: '100%',
    minBlockSize: euiTheme.size.xl,
    borderRadius: euiTheme.border.radius.small,
    border: `${euiTheme.border.width.thin} solid ${
      isInvalid ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBasePlain
    }`,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    '&:focus-within': { borderColor: euiTheme.colors.borderStrongPrimary },
  } as const;

  const readView = (
    <div
      role="textbox"
      aria-label={ariaLabel}
      aria-invalid={isInvalid}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          startEditing({ kind: 'end' });
        }
      }}
      onFocus={() => startEditing({ kind: 'end' })}
      css={{
        flex: '1 1 auto',
        minWidth: 0,
        // Text runs keep their width; only chips shrink (each truncates its own path), so the
        // line never overlaps itself.
        display: 'flex',
        alignItems: 'center',
        paddingInline: euiTheme.size.s,
        overflow: 'hidden',
        whiteSpace: 'pre',
        fontSize,
        cursor: 'text',
        outline: 'none',
      }}
      data-test-subj={testSubj}
      data-mode="read"
      data-language={language}
    >
      {value.length === 0 ? (
        <span css={{ color: euiTheme.colors.textSubdued }}>{bind.teachingPlaceholder}</span>
      ) : (
        readRuns(value, tokens)
      )}
    </div>
  );

  const editView = (
    <div
      css={{
        flex: '1 1 auto',
        minWidth: 0,
        // Line up with the read view's text.
        paddingInlineStart: euiTheme.size.s,
        // Transparent so the field box (border, background) shows through.
        '.monaco-editor, .monaco-editor-background, .monaco-editor .margin': {
          backgroundColor: 'transparent',
        },
        ...chipCss,
      }}
      data-mode="edit"
    >
      <CodeEditor
        languageId="plaintext"
        chromeOverrides={workflowsEditorChromeOverrides}
        value={value}
        onChange={(text, event) => {
          const single = text.replace(/\r?\n/g, ' ');
          onChange(single, caretAfterChange(single, event));
        }}
        height={heightPx}
        aria-label={ariaLabel}
        dataTestSubj={testSubj}
        editorDidMount={handleEditorMount}
        options={{
          ...EDITOR_OPTIONS,
          padding: { top: Math.max(0, Math.floor((heightPx - 2 - 18) / 2)) },
        }}
      />
    </div>
  );

  return (
    <>
      <div css={boxCss}>
        {isEditing ? editView : readView}
        <div css={{ paddingInlineEnd: euiTheme.size.xs, flex: '0 0 auto' }}>{appendControls}</div>
      </div>
      {warning ? (
        <ContainerInSentenceCallout
          token={warning}
          onFix={() => onChange(insertTokenAsJsonText(value, warning), value.length)}
          onDismiss={dismissWarning}
          testSubj={testSubj}
        />
      ) : null}
    </>
  );
}

interface ReadSegment {
  readonly start: number;
  readonly end: number;
  /** Set for a reference; plain text otherwise. */
  readonly token?: ReferenceToken;
}

/**
 * Text runs and chips in order. When the line is wider than the field, only the last text run
 * gives way (it truncates with an ellipsis): a chip squeezed instead would collapse to a sliver
 * while the text it makes room for is clipped anyway. A chip alone wider than the field still
 * truncates its own path.
 */
const readRuns = (text: string, tokens: readonly ReferenceToken[]): React.ReactNode[] => {
  const segments: ReadSegment[] = [];
  let cursor = 0;
  tokens.forEach((token) => {
    if (token.start > cursor) segments.push({ start: cursor, end: token.start });
    segments.push({ start: token.start, end: token.end, token });
    cursor = token.end;
  });
  if (cursor < text.length) segments.push({ start: cursor, end: text.length });
  const lastTextIndex = segments.map((segment) => !segment.token).lastIndexOf(true);

  return segments.map(({ start, end, token }, index) =>
    token ? (
      <span
        key={`c${start}`}
        data-ref-start={start}
        data-ref-end={end}
        css={{ display: 'inline-flex', flex: '0 0 auto', maxInlineSize: '100%' }}
      >
        <ReferenceChip
          expression={token.expression}
          typeLabel={token.typeLabel}
          tone={token.tone}
          hint={token.hover}
          data-test-subj="workflowReferenceChip"
        />
      </span>
    ) : (
      <span
        key={`t${start}`}
        data-run-offset={start}
        css={
          index === lastTextIndex
            ? { flex: '0 1 auto', minInlineSize: 0, overflow: 'hidden', textOverflow: 'ellipsis' }
            : { flex: '0 0 auto' }
        }
      >
        {text.slice(start, end)}
      </span>
    )
  );
};
