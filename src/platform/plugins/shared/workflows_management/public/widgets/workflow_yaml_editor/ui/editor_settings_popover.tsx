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
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import type { LayoutDirection } from '@kbn/workflows';

interface EditorSettingsPopoverProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  /** Graph layout direction. Owned by the parent so it can be threaded into the visual editor. */
  graphDirection?: LayoutDirection;
  onGraphDirectionChange?: (direction: LayoutDirection) => void;
  openRef?: React.MutableRefObject<(() => void) | null>;
}

export function EditorSettingsPopover({
  editorRef,
  graphDirection,
  onGraphDirectionChange,
  openRef,
}: EditorSettingsPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(componentStyles);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!openRef) return;
    openRef.current = () => setIsOpen(true);
    return () => {
      openRef.current = null;
    };
  }, [openRef]);
  const [showIndentGuides, setShowIndentGuides] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(false);

  const indentGuidesCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-indent-guides' });
  const whitespaceCheckboxId = useGeneratedHtmlId({ prefix: 'wf-editor-setting-whitespace' });
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-title' });
  const editorSectionId = useGeneratedHtmlId({ prefix: 'wf-editor-settings-editor-section' });
  const visualizationSectionId = useGeneratedHtmlId({
    prefix: 'wf-editor-settings-viz-section',
  });
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
      {showGraphLayoutSection && (
        <>
          <EuiHorizontalRule margin="none" />
          <section aria-labelledby={visualizationSectionId} css={styles.section}>
            <div id={visualizationSectionId} css={styles.sectionHeader}>
              {i18n.translate('workflows.yamlEditor.editorSettings.graphLayoutSectionTitle', {
                defaultMessage: 'Visualization',
              })}
            </div>
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
          </section>
        </>
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
