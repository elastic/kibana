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
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSwitch,
  EuiText,
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

const directionOptions = [
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
] satisfies EuiButtonGroupOptionProps[];

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

  const popoverTitleId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-title' });
  const editorSectionId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-editor-section' });
  const directionSectionId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-direction-section' });

  const handleIndentGuidesChange = useCallback(() => {
    setShowIndentGuides(!showIndentGuides);
    editorRef.current?.updateOptions({
      guides: { indentation: !showIndentGuides },
    });
  }, [editorRef, showIndentGuides]);

  const handleWhitespaceChange = useCallback(() => {
    setShowWhitespace(!showWhitespace);
    editorRef.current?.updateOptions({
      renderWhitespace: !showWhitespace ? 'all' : 'none',
    });
  }, [editorRef, showWhitespace]);

  const label = i18n.translate('workflows.yamlEditor.editorSettings.label', {
    defaultMessage: 'Editor settings',
  });

  const directionLabel = i18n.translate('workflows.yamlEditor.editorSettings.directionLabel', {
    defaultMessage: 'Direction',
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
      <EuiForm component="div" css={styles.form}>
        <section aria-labelledby={editorSectionId} css={styles.section}>
          <div id={editorSectionId} css={styles.sectionHeader}>
            {i18n.translate('workflows.yamlEditor.editorSettings.editorSectionTitle', {
              defaultMessage: 'Editor',
            })}
          </div>
          <EuiFormRow css={styles.checkboxRow}>
            <EuiSwitch
              label={
                <EuiText size="xs">
                  {i18n.translate('workflows.yamlEditor.editorSettings.showIndentGuides', {
                    defaultMessage: 'Show indent guides',
                  })}
                </EuiText>
              }
              labelProps={{
                style: {
                  fontWeight: euiTheme.font.weight.medium,
                },
              }}
              checked={showIndentGuides}
              onChange={handleIndentGuidesChange}
              compressed
            />
          </EuiFormRow>
          <EuiFormRow css={styles.checkboxRow}>
            <EuiSwitch
              label={
                <EuiText size="xs">
                  {i18n.translate('workflows.yamlEditor.editorSettings.showWhitespace', {
                    defaultMessage: 'Show whitespace characters',
                  })}
                </EuiText>
              }
              labelProps={{
                style: {
                  fontWeight: euiTheme.font.weight.medium,
                },
              }}
              checked={showWhitespace}
              onChange={handleWhitespaceChange}
              compressed
            />
          </EuiFormRow>
        </section>
        {graphDirection && onGraphDirectionChange && (
          <section aria-labelledby={directionSectionId} css={styles.section}>
            <div id={directionSectionId} css={styles.sectionHeader}>
              {i18n.translate('workflows.yamlEditor.editorSettings.directionSectionTitle', {
                defaultMessage: 'Visualization',
              })}
            </div>
            <EuiFormRow label={directionLabel} display="columnCompressed" css={styles.directionRow}>
              <EuiButtonGroup
                legend={directionLabel}
                options={directionOptions}
                idSelected={graphDirection}
                onChange={(id) => onGraphDirectionChange(id as LayoutDirection)}
                buttonSize="compressed"
                isIconOnly
              />
            </EuiFormRow>
          </section>
        )}
      </EuiForm>
    </EuiPopover>
  );
}

const componentStyles = {
  form: css({
    // EuiForm adds a large gap between fieldsets/sections; keep the compact popover rhythm.
    gap: 0,
  }),
  section: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.m}`,
    }),
  sectionHeader: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontSize: '11px',
      fontWeight: euiTheme.font.weight.semiBold,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: euiTheme.colors.textSubdued,
      marginBottom: euiTheme.size.s,
    }),
  checkboxRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginBlock: 0,
      paddingBlock: 0,
      '& + &': {
        marginTop: euiTheme.size.s,
      },
    }),
  directionRow: css({
    marginBlock: 0,
    paddingBlock: 0,
  }),
};
