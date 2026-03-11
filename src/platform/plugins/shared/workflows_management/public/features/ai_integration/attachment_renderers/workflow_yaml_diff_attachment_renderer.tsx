/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';

interface WorkflowYamlDiffData {
  beforeYaml: string;
  afterYaml: string;
  proposalId: string;
  workflowId?: string;
  name?: string;
}

interface WorkflowYamlDiffAttachment {
  id: string;
  type: string;
  data: WorkflowYamlDiffData;
}

const DIFF_EDITOR_HEIGHT = 200;

const findFirstChangedLine = (beforeYaml: string, afterYaml: string): number => {
  const beforeLines = beforeYaml.split('\n');
  const afterLines = afterYaml.split('\n');
  const minLen = Math.min(beforeLines.length, afterLines.length);

  for (let i = 0; i < minLen; i++) {
    if (beforeLines[i] !== afterLines[i]) {
      return i + 1;
    }
  }

  return minLen + 1;
};

const MonacoDiffViewer: React.FC<{
  beforeYaml: string;
  afterYaml: string;
}> = ({ beforeYaml, afterYaml }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IDiffEditor | null>(null);
  const [isActive, setIsActive] = useState(false);

  const handleClick = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsActive(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const originalModel = monaco.editor.createModel(beforeYaml, 'yaml');
    const modifiedModel = monaco.editor.createModel(afterYaml, 'yaml');

    const diffEditor = monaco.editor.createDiffEditor(container, {
      readOnly: true,
      renderSideBySide: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'off',
      folding: false,
      glyphMargin: false,
      overviewRulerLanes: 0,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        handleMouseWheel: false,
      },
      hideUnchangedRegions: {
        enabled: true,
        revealLineCount: 2,
        minimumLineCount: 3,
        contextLineCount: 3,
      },
      renderOverviewRuler: false,
      fontSize: 12,
      lineHeight: 18,
      padding: { top: 4, bottom: 4 },
      contextmenu: false,
      domReadOnly: true,
      lightbulb: { enabled: false },
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      hover: { enabled: false },
      parameterHints: { enabled: false },
      renderIndicators: false,
      renderMarginRevertIcon: false,
    });

    diffEditor.setModel({ original: originalModel, modified: modifiedModel });

    const firstChangedLine = findFirstChangedLine(beforeYaml, afterYaml);
    const topLine = Math.max(1, firstChangedLine - 2);

    requestAnimationFrame(() => {
      diffEditor.getModifiedEditor().revealLineNearTop(topLine);
    });

    editorRef.current = diffEditor;

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      editorRef.current = null;
    };
  }, [beforeYaml, afterYaml]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.updateOptions({
      scrollbar: {
        vertical: isActive ? 'auto' : 'hidden',
        horizontal: isActive ? 'auto' : 'hidden',
        handleMouseWheel: isActive,
      },
    });
  }, [isActive]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setIsActive(true);
    }
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={containerRef}
      onFocus={handleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Workflow diff"
      style={{ height: DIFF_EDITOR_HEIGHT, width: '100%' }}
    />
  );
};

const DiffInlineContent: React.FC<{
  attachment: WorkflowYamlDiffAttachment;
}> = ({ attachment }) => {
  const { euiTheme } = useEuiTheme();
  const { beforeYaml, afterYaml } = attachment.data;

  const headerStyles = css`
    padding: ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
  `;

  if (beforeYaml === afterYaml) {
    return (
      <EuiText
        size="s"
        color="subdued"
        css={css`
          padding: ${euiTheme.size.s};
        `}
      >
        {i18n.translate('workflowsManagement.attachmentRenderers.diff.noChanges', {
          defaultMessage: 'No changes detected',
        })}
      </EuiText>
    );
  }

  return (
    <div>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        css={headerStyles}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('workflowsManagement.attachmentRenderers.diff.proposedChanges', {
              defaultMessage: 'Proposed changes',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <MonacoDiffViewer beforeYaml={beforeYaml} afterYaml={afterYaml} />
    </div>
  );
};

export const workflowYamlDiffAttachmentUiDefinition = {
  getLabel: (attachment: WorkflowYamlDiffAttachment) =>
    attachment.data.name
      ? i18n.translate('workflowsManagement.attachmentRenderers.diff.labelWithName', {
          defaultMessage: '{name} changes',
          values: { name: attachment.data.name },
        })
      : i18n.translate('workflowsManagement.attachmentRenderers.diff.label', {
          defaultMessage: 'Workflow changes',
        }),
  getIcon: () => 'merge',
  renderInlineContent: ({ attachment }: { attachment: WorkflowYamlDiffAttachment }) => (
    <DiffInlineContent attachment={attachment} />
  ),
};
