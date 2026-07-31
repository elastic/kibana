/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { WorkflowYamlValidationAccordion } from '../../widgets/workflow_yaml_editor/ui/workflow_yaml_validation_accordion';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

/** Collapsed footer row height — matches the YAML editor validation accordion. */
export const WORKFLOW_CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT = '48px';

/** Space reserved for the fixed settings button (icon + right padding). */
export const WORKFLOW_CHANGE_HISTORY_PREVIEW_SETTINGS_RESERVE_PX = 48;

export interface WorkflowChangeHistoryPreviewFooterProps {
  validationResults: YamlValidationResult[];
  isEditorMounted: boolean;
  isValidationLoading: boolean;
  highlightValidationErrors: boolean;
  onValidationErrorClick?: (error: YamlValidationResult) => void;
}

export const WorkflowChangeHistoryPreviewFooter = ({
  validationResults,
  isEditorMounted,
  isValidationLoading,
  highlightValidationErrors,
  onValidationErrorClick,
}: WorkflowChangeHistoryPreviewFooterProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);
  const showValidationLoading = isValidationLoading;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={styles.footer}
      data-test-subj="workflowChangeHistoryPreviewFooter"
    >
      {highlightValidationErrors ? (
        <div
          css={styles.validationAccordion}
          data-test-subj="workflowChangeHistoryPreviewValidationAccordion"
        >
          <WorkflowYamlValidationAccordion
            isMounted={isEditorMounted}
            isLoading={showValidationLoading}
            error={null}
            validationErrors={showValidationLoading ? null : validationResults}
            onErrorClick={onValidationErrorClick}
          />
        </div>
      ) : (
        <div css={styles.footerBarSpacer} aria-hidden={true} />
      )}
    </EuiFlexGroup>
  );
};

const componentStyles = {
  footer: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      flexShrink: 0,
      minHeight: WORKFLOW_CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,

      '.euiAccordion': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderTop: euiTheme.border.thin,
      },
    }),
  footerBarSpacer: ({ euiTheme }: UseEuiTheme) =>
    css({
      minHeight: WORKFLOW_CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
      borderTop: euiTheme.border.thin,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  validationAccordion: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingRight: `calc(${euiTheme.size.m} + ${WORKFLOW_CHANGE_HISTORY_PREVIEW_SETTINGS_RESERVE_PX}px)`,
    }),
};
