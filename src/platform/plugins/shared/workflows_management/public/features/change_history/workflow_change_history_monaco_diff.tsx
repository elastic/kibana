/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';
import { monaco } from '@kbn/code-editor';
import { useWorkflowsMonacoTheme, WORKFLOWS_MONACO_EDITOR_THEME } from '@kbn/workflows-ui';

export interface WorkflowChangeHistoryMonacoDiffProps {
  originalYaml: string;
  modifiedYaml: string;
}

export const WorkflowChangeHistoryMonacoDiff = ({
  originalYaml,
  modifiedYaml,
}: WorkflowChangeHistoryMonacoDiffProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);

  useWorkflowsMonacoTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const originalModel = monaco.editor.createModel(originalYaml, 'yaml');
    const modifiedModel = monaco.editor.createModel(modifiedYaml, 'yaml');

    const diffEditor = monaco.editor.createDiffEditor(container, {
      theme: WORKFLOWS_MONACO_EDITOR_THEME,
      readOnly: true,
      renderSideBySide: false,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      folding: true,
      glyphMargin: false,
      renderOverviewRuler: false,
      contextmenu: false,
      domReadOnly: true,
      hideUnchangedRegions: {
        enabled: true,
        revealLineCount: 2,
        minimumLineCount: 3,
        contextLineCount: 3,
      },
    });

    diffEditor.setModel({ original: originalModel, modified: modifiedModel });

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
    };
  }, [modifiedYaml, originalYaml]);

  return (
    <div
      ref={containerRef}
      data-test-subj="workflowChangeHistoryYamlDiff"
      css={css`
        height: 100%;
        min-height: 0;
      `}
    />
  );
};
