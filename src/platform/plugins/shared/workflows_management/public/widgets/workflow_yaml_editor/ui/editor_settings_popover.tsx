/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonGroupOptionProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCheckbox,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import type { LayoutDirection } from '@kbn/workflows';

interface EditorSettingsPopoverProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  graphDirection?: LayoutDirection;
  onGraphDirectionChange?: (next: LayoutDirection) => void;
}

export function EditorSettingsPopover({
  editorRef,
  graphDirection,
  onGraphDirectionChange,
}: EditorSettingsPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(componentStyles);
  const [isOpen, setIsOpen] = useState(false);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(false);

  const indentGuidesCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-indent-guides' });
  const whitespaceCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-whitespace' });
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-title' });
  const editorSectionId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-editor-section' });
  const directionSectionId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-direction-section' });

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
      panelStyle={{ minWidth: 280 }}
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
      <section aria-labelledby={editorSectionId} css={styles.section}>
        <div id={editorSectionId} css={styles.sectionHeader}>
          {i18n.translate('workflows.yamlEditor.editorSettings.editorSectionTitle', {
            defaultMessage: 'Editor',
          })}
        </div>
        <div css={styles.fieldStack}>
          <EuiCheckbox
            id={indentGuidesCheckboxId}
            label={i18n.translate('workflows.yamlEditor.editorSettings.showIndentGuides', {
              defaultMessage: 'Show indent guides',
            })}
            checked={showIndentGuides}
            onChange={handleIndentGuidesChange}
          />
          <EuiCheckbox
            id={whitespaceCheckboxId}
            label={i18n.translate('workflows.yamlEditor.editorSettings.showWhitespace', {
              defaultMessage: 'Show whitespace characters',
            })}
            checked={showWhitespace}
            onChange={handleWhitespaceChange}
          />
        </div>
      </section>
      {graphDirection && onGraphDirectionChange && (
        <section aria-labelledby={directionSectionId} css={styles.section}>
          <div id={directionSectionId} css={styles.sectionHeader}>
            {i18n.translate('workflows.yamlEditor.editorSettings.directionSectionTitle', {
              defaultMessage: 'Direction',
            })}
          </div>
          <EuiButtonGroup
            legend={i18n.translate('workflows.yamlEditor.editorSettings.directionLegend', {
              defaultMessage: 'Graph layout direction',
            })}
            options={
              [
                {
                  id: 'TB',
                  iconType: 'arrowDown',
                  label: i18n.translate('workflows.yamlEditor.editorSettings.directionVertical', {
                    defaultMessage: 'Vertical',
                  }),
                },
                {
                  id: 'LR',
                  iconType: 'arrowRight',
                  label: i18n.translate('workflows.yamlEditor.editorSettings.directionHorizontal', {
                    defaultMessage: 'Horizontal',
                  }),
                },
              ] satisfies EuiButtonGroupOptionProps[]
            }
            idSelected={graphDirection}
            onChange={(id) => onGraphDirectionChange(id as LayoutDirection)}
            buttonSize="compressed"
            isIconOnly
          />
        </section>
      )}
    </EuiPopover>
  );
}

const componentStyles = {
  section: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.m}`,
    }),
  // Small uppercase subdued subheader — replaces the heavy second-level
  // `EuiPopoverTitle` so the popover reads as one cohesive panel with two
  // grouped sections rather than two stacked sub-popovers.
  sectionHeader: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '11px',
      fontWeight: euiTheme.font.weight.semiBold,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: euiTheme.colors.textSubdued,
      marginBottom: euiTheme.size.s,
    }),
  fieldStack: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      gap: euiTheme.size.s,
    }),
};
