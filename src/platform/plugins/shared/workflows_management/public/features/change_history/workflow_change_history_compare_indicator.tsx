/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';
import type {
  WorkflowChangeHistoryCompareBadgeColor,
  WorkflowChangeHistoryCompareIndicator,
} from './get_workflow_change_history_compare_indicator';
import {
  COMPARING_WITH_LABEL,
  PREVIOUS_VERSION_LABEL,
  SELECTED_VERSION_LABEL,
  VERSION_BADGE,
  VERSION_BADGE_FALLBACK,
} from './translations';

export interface WorkflowChangeHistoryCompareIndicatorProps {
  indicator: WorkflowChangeHistoryCompareIndicator;
}

const VersionBadge = ({
  version,
  badgeLabel,
  badgeColor = 'hollow',
  testSubj,
}: {
  version?: number;
  badgeLabel?: string;
  badgeColor?: WorkflowChangeHistoryCompareBadgeColor;
  testSubj: string;
}): JSX.Element | null => {
  const { euiTheme } = useEuiTheme();

  if (version != null) {
    return (
      <EuiBadge color="hollow" css={versionBadgeStyle} data-test-subj={testSubj}>
        {VERSION_BADGE(version)}
      </EuiBadge>
    );
  }

  if (badgeLabel) {
    return (
      <EuiBadge
        color={badgeColor === 'warning' ? euiTheme.colors.backgroundLightWarning : 'hollow'}
        css={versionBadgeStyle}
        data-test-subj={testSubj}
      >
        {badgeLabel}
      </EuiBadge>
    );
  }

  return (
    <EuiText size="s" color="subdued" data-test-subj={testSubj}>
      {VERSION_BADGE_FALLBACK}
    </EuiText>
  );
};

export const WorkflowChangeHistoryCompareIndicatorBar = ({
  indicator,
}: WorkflowChangeHistoryCompareIndicatorProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={styles.unifiedContainer}
      data-test-subj="workflowChangeHistoryCompareIndicator"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" css={styles.label}>
          {COMPARING_WITH_LABEL}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <VersionBadge
          version={indicator.baselineVersion}
          testSubj="workflowChangeHistoryCompareIndicatorBadge"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const WorkflowChangeHistoryCompareSplitPaneLabels = ({
  indicator,
}: WorkflowChangeHistoryCompareIndicatorProps): JSX.Element => {
  const styles = useMemoCss(componentStyles);

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      css={styles.splitContainer}
      data-test-subj="workflowChangeHistoryCompareSplitPaneLabels"
    >
      <EuiFlexItem css={styles.splitPaneLeft}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" css={styles.label}>
              {PREVIOUS_VERSION_LABEL}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <VersionBadge
              version={indicator.baselineVersion}
              testSubj="workflowChangeHistoryCompareSplitBaselineBadge"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem css={styles.splitPaneRight}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" css={styles.label}>
              {SELECTED_VERSION_LABEL}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <VersionBadge
              version={indicator.currentVersion}
              badgeLabel={indicator.currentBadgeLabel}
              badgeColor={indicator.currentBadgeColor}
              testSubj="workflowChangeHistoryCompareSplitCurrentBadge"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const versionBadgeStyle = css({
  fontWeight: 500,
});

const compareHeaderBaseStyle = ({ euiTheme }: UseEuiTheme) =>
  css(changeHistoryPreviewTypography, {
    flex: '0 0 auto',
    borderBottom: euiTheme.border.thin,
  });

const componentStyles = {
  unifiedContainer: (themeContext: UseEuiTheme) =>
    css(compareHeaderBaseStyle(themeContext), {
      padding: `${themeContext.euiTheme.size.s} ${themeContext.euiTheme.size.m}`,
    }),
  splitContainer: compareHeaderBaseStyle,
  splitPaneLeft: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '1 1 50%',
      padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
      borderRight: euiTheme.border.thin,
    }),
  splitPaneRight: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '1 1 50%',
      padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
    }),
  label: ({ euiTheme }: UseEuiTheme) =>
    css(changeHistoryPreviewTypography, {
      color: euiTheme.colors.textParagraph,
      fontWeight: euiTheme.font.weight.regular,
    }),
};
