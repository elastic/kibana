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
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';

interface EditorSettingsPopoverProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

export function EditorSettingsPopover({ editorRef }: EditorSettingsPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(false);

  const indentGuidesCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-indent-guides' });
  const whitespaceCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-whitespace' });
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-title' });

  const handleIndentGuidesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const enabled = e.target.checked;
      setShowIndentGuides(enabled);
      editorRef.current?.updateOptions({
        guides: { indentation: enabled },
      });
    },
    [editorRef]
  );

  const handleWhitespaceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const enabled = e.target.checked;
      setShowWhitespace(enabled);
      editorRef.current?.updateOptions({
        renderWhitespace: enabled ? 'all' : 'none',
      });
    },
    [editorRef]
  );

  const label = i18n.translate('workflows.yamlEditor.editorSettings.label', {
    defaultMessage: 'Editor settings',
  });

  return (
    <EuiPopover
      css={{ marginLeft: euiTheme.size.xs }}
      data-test-subj="workflowYamlEditorSettingsPopover"
      aria-labelledby={popoverTitleId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upRight"
      panelPaddingSize="none"
      button={
        <EuiToolTip content={label} delay="long" disableScreenReaderOutput>
          <EuiButtonIcon
            size="xs"
            iconType="controlsHorizontal"
            data-test-subj="workflowYamlEditorSettingsButton"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={label}
            color="primary"
          />
        </EuiToolTip>
      }
    >
      <EuiPopoverTitle id={popoverTitleId} paddingSize="s">
        {label}
      </EuiPopoverTitle>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        css={{ padding: `${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.s}` }}
        responsive={false}
      >
        <EuiFlexItem>
          <EuiCheckbox
            id={indentGuidesCheckboxId}
            label={i18n.translate('workflows.yamlEditor.editorSettings.showIndentGuides', {
              defaultMessage: 'Show indent guides',
            })}
            checked={showIndentGuides}
            onChange={handleIndentGuidesChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCheckbox
            id={whitespaceCheckboxId}
            label={i18n.translate('workflows.yamlEditor.editorSettings.showWhitespace', {
              defaultMessage: 'Show whitespace characters',
            })}
            checked={showWhitespace}
            onChange={handleWhitespaceChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
}
