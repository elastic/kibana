/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import type { LayoutDirection } from '@kbn/workflows';

interface EditorSettingsPopoverProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  /** Graph layout direction. Owned by the parent so it can be threaded into the visual editor. */
  graphDirection?: LayoutDirection;
  onGraphDirectionChange?: (direction: LayoutDirection) => void;
}

export function EditorSettingsPopover({
  editorRef,
  graphDirection,
  onGraphDirectionChange,
}: EditorSettingsPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(false);

  const indentGuidesCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-indent-guides' });
  const whitespaceCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-whitespace' });
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-title' });
  const layoutGroupId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-graph-layout' });

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

  const layoutOptions = useMemo<EuiButtonGroupOptionProps[]>(
    () => [
      {
        id: 'TB',
        label: i18n.translate('workflows.yamlEditor.editorSettings.graphLayoutTB', {
          defaultMessage: 'Vertical',
        }),
        iconType: 'sortDown',
      },
      {
        id: 'LR',
        label: i18n.translate('workflows.yamlEditor.editorSettings.graphLayoutLR', {
          defaultMessage: 'Horizontal',
        }),
        iconType: 'sortRight',
      },
    ],
    []
  );

  const label = i18n.translate('workflows.yamlEditor.editorSettings.label', {
    defaultMessage: 'Editor settings',
  });

  const showGraphLayoutSection = onGraphDirectionChange != null;

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
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="controlsHorizontal"
            size="s"
            data-test-subj="workflowYamlEditorSettingsButton"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={label}
            color="text"
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
      {showGraphLayoutSection && (
        <>
          <EuiPopoverTitle id={popoverTitleId} paddingSize="s">
            {i18n.translate('workflows.yamlEditor.editorSettings.graphLayoutSectionTitle', {
              defaultMessage: 'Visualization settings',
            })}
          </EuiPopoverTitle>
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            css={{ padding: `${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.s}` }}
            responsive={false}
          >
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <h4
                  css={{
                    margin: 0,
                    marginBottom: euiTheme.size.xs,
                    fontWeight: euiTheme.font.weight.medium,
                  }}
                >
                  {i18n.translate('workflows.yamlEditor.editorSettings.graphLayoutHeading', {
                    defaultMessage: 'Layout direction',
                  })}
                </h4>
              </EuiText>
              <EuiButtonGroup
                legend={i18n.translate('workflows.yamlEditor.editorSettings.graphLayoutLegend', {
                  defaultMessage: 'Graph layout direction',
                })}
                idSelected={graphDirection ?? 'TB'}
                onChange={(id) => onGraphDirectionChange?.(id as LayoutDirection)}
                options={layoutOptions}
                type="single"
                buttonSize="compressed"
                isFullWidth
                data-test-subj={layoutGroupId}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPopover>
  );
}
