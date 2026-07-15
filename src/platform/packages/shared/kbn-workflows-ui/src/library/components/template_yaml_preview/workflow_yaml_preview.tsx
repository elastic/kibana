/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { isTriggerType } from '@kbn/workflows';
import { getTypeIconDataUrl } from './get_type_icon_data_url';
import { computeTypeDecorations, INLINE_HIGHLIGHT_CLASS, type UsedType } from './type_decorations';
import { getTypeIconBaseStyles } from './type_icon_styles';
import { useWorkflowsUiServices } from '../../../context';
import {
  useWorkflowsMonacoTheme,
  WORKFLOWS_MONACO_EDITOR_THEME,
} from '../../../hooks/use_workflows_monaco_theme';

const READ_ONLY_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  theme: WORKFLOWS_MONACO_EDITOR_THEME,
  readOnly: true,
  domReadOnly: true,
  contextmenu: false,
  minimap: { enabled: false },
  automaticLayout: true,
  lineNumbers: 'on',
  glyphMargin: true,
  folding: true,
  showFoldingControls: 'mouseover',
  scrollBeyondLastLine: false,
  tabSize: 2,
  lineNumbersMinChars: 2,
  insertSpaces: true,
  fontSize: 14,
  lineHeight: 23,
  renderWhitespace: 'none',
  roundedSelection: false,
  guides: { indentation: true },
  wordWrap: 'on',
  wrappingIndent: 'indent',
  lightbulb: { enabled: false },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  padding: { top: 16, bottom: 16 },
};

const noop = () => {};

function buildIconCss(rules: Array<{ cssClass: string; url: string }>): string {
  // The `::after` box (size, spacing, background-size) comes from
  // getTypeIconBaseStyles; here we only set the per-type icon image.
  return rules
    .filter((rule) => rule.url)
    .map(
      (rule) => `
.monaco-editor .view-line span.${INLINE_HIGHLIGHT_CLASS}.${rule.cssClass}::after {
  background-image: url("${rule.url}");
}`
    )
    .join('\n');
}

function dedupeByCssClass(usedTypes: UsedType[]): UsedType[] {
  const seen = new Set<string>();
  const result: UsedType[] = [];
  for (const used of usedTypes) {
    if (!seen.has(used.cssClass)) {
      seen.add(used.cssClass);
      result.push(used);
    }
  }
  return result;
}

export interface WorkflowYamlPreviewProps {
  /** Workflow YAML to render (already cleaned of the `template-metadata` block). */
  yaml: string;
  /** Editor height. Defaults to `100%` so the parent controls the size. */
  height?: number | string;
  'data-test-subj'?: string;
}

/**
 * Read-only Monaco preview of a workflow YAML, styled like the workflow editor:
 * the workflows theme plus inline step/trigger type icons rendered next to each
 * `type:` value. Requires a `WorkflowsUiServicesProvider` ancestor to resolve
 * connector / step / trigger icons.
 */
export const WorkflowYamlPreview = React.memo<WorkflowYamlPreviewProps>(
  ({ yaml, height = '100%', 'data-test-subj': dataTestSubj = 'workflowYamlPreview' }) => {
    useWorkflowsMonacoTheme();
    const euiThemeContext = useEuiTheme();
    const { workflowsExtensions, triggersActionsUi } = useWorkflowsUiServices();

    const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
    const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [iconCss, setIconCss] = useState('');

    const doc = useMemo(() => parseDocument(yaml, { keepSourceTokens: true }), [yaml]);

    const handleEditorDidMount = useCallback(
      (mountedEditor: monaco.editor.IStandaloneCodeEditor) => setEditor(mountedEditor),
      []
    );

    useEffect(() => {
      const model = editor?.getModel();
      if (!editor || !model) {
        return;
      }

      const { decorations, usedTypes } = computeTypeDecorations(model, doc, {
        isTriggerTypeAllowed: (type) =>
          isTriggerType(type) || Boolean(workflowsExtensions.getTriggerDefinition(type)),
      });
      decorationsRef.current?.clear();
      decorationsRef.current = decorations.length
        ? editor.createDecorationsCollection(decorations)
        : null;

      let cancelled = false;
      void (async () => {
        const rules = await Promise.all(
          dedupeByCssClass(usedTypes).map(async ({ type, kind, cssClass }) => ({
            cssClass,
            url: await getTypeIconDataUrl({
              type,
              kind,
              workflowsExtensions,
              actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
            }),
          }))
        );
        if (!cancelled) {
          setIconCss(buildIconCss(rules));
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [editor, doc, workflowsExtensions, triggersActionsUi]);

    return (
      <>
        <Global styles={getTypeIconBaseStyles(euiThemeContext)} />
        {iconCss ? <Global styles={css(iconCss)} /> : null}
        <CodeEditor
          languageId="yaml"
          value={yaml}
          height={height}
          options={READ_ONLY_OPTIONS}
          editorDidMount={handleEditorDidMount}
          onChange={noop}
          dataTestSubj={dataTestSubj}
        />
      </>
    );
  }
);
WorkflowYamlPreview.displayName = 'WorkflowYamlPreview';
