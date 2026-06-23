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

export interface WorkflowChangeHistoryPreviewFooterProps {
  validationResults: YamlValidationResult[];
  isEditorMounted: boolean;
  onValidationErrorClick?: (error: YamlValidationResult) => void;
  settingsSlot: React.ReactNode;
}

export const WorkflowChangeHistoryPreviewFooter = ({
  validationResults,
  isEditorMounted,
  onValidationErrorClick,
  settingsSlot,
}: WorkflowChangeHistoryPreviewFooterProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={styles.footer}
      data-test-subj="workflowChangeHistoryPreviewFooter"
    >
      <WorkflowYamlValidationAccordion
        isMounted={isEditorMounted}
        isLoading={false}
        error={null}
        validationErrors={validationResults}
        onErrorClick={onValidationErrorClick}
        extraAction={settingsSlot}
      />
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
};
