/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormattedRelativeEnhanced } from '../../../shared/ui';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';

export interface WorkflowUnsavedChangesBadgeProps {
  hasChanges: boolean;
  highlightDiff: boolean;
  setHighlightDiff: React.Dispatch<React.SetStateAction<boolean>>;
  lastUpdatedAt: Date | null;
}

export function WorkflowUnsavedChangesBadge({
  hasChanges,
  highlightDiff,
  setHighlightDiff,
  lastUpdatedAt,
}: WorkflowUnsavedChangesBadgeProps) {
  const { euiTheme } = useEuiTheme();
  const getFormattedDateTime = useGetFormattedDateTime();
  const fullDateFormatted = lastUpdatedAt ? getFormattedDateTime(lastUpdatedAt) : undefined;
  const label = highlightDiff
    ? i18n.translate('workflows.unsavedChangesBadge.hideDiff', {
        defaultMessage: 'Hide diff highlighting',
      })
    : i18n.translate('workflows.unsavedChangesBadge.showDiff', {
        defaultMessage: 'Show diff highlighting',
      });
  return (
    <div>
      {hasChanges ? (
        <EuiBadge
          data-test-subj="workflowUnsavedChangesBadge"
          color={euiTheme.colors.backgroundLightWarning}
          onClick={() => setHighlightDiff((state) => !state)}
          role="button"
          tabIndex={0}
          aria-pressed={highlightDiff}
          onClickAriaLabel={label}
          onKeyDown={() => {}}
          title={label}
        >
          <FormattedMessage id="workflows.unsavedChangesBadge" defaultMessage="Unsaved changes" />
        </EuiBadge>
      ) : (
        <EuiBadge
          data-test-subj="workflowSavedChangesBadge"
          iconType="check"
          color={euiTheme.colors.backgroundBaseDisabled}
          aria-label={fullDateFormatted}
          title={fullDateFormatted}
        >
          <FormattedMessage id="workflows.workflowDetail.yamlEditor.saved" defaultMessage="Saved" />{' '}
          {lastUpdatedAt ? <FormattedRelativeEnhanced value={lastUpdatedAt} style="short" /> : null}
        </EuiBadge>
      )}
    </div>
  );
}
