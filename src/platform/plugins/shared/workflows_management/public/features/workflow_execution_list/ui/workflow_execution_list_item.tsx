/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed, UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { ExecutionStatus } from '@kbn/workflows';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';

export const getExecutionTitleColor = (
  euiTheme: EuiThemeComputed,
  status: ExecutionStatus
): string | undefined => {
  if (status === ExecutionStatus.FAILED || status === ExecutionStatus.CANCELLED) {
    return getExecutionStatusColors(euiTheme, status).color;
  }
};

interface WorkflowExecutionListItemProps {
  status: ExecutionStatus;
  startedAt: Date | null;
  duration: number | null;
  selected?: boolean;
  onClick?: () => void;
}
export const WorkflowExecutionListItem = React.memo<WorkflowExecutionListItemProps>(
  ({ status, startedAt, duration, selected, onClick }) => {
    const { euiTheme } = useEuiTheme();
    const styles = useMemoCss(componentStyles);
    const getFormattedDate = useGetFormattedDateTime();
    const formattedDate = startedAt ? getFormattedDate(startedAt) : null;
    const formattedDuration = useMemo(() => {
      if (duration) {
        return formatDuration(duration);
      }
      return null;
    }, [duration]);

    const panelCss = useMemo(() => {
      if (selected) {
        return styles.selectedContainer;
      }
      if (onClick) {
        return styles.selectableContainer;
      }
    }, [selected, onClick, styles]);

    return (
      <EuiPanel color="plain" hasShadow={false} paddingSize="m" hasBorder css={panelCss}>
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          justifyContent="flexStart"
          onClick={onClick ?? undefined}
          responsive={false}
          color="plain"
        >
          <EuiFlexItem grow={false}>{getExecutionStatusIcon(euiTheme, status)}</EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiText
                  size="s"
                  css={{ fontWeight: 'bold', color: getExecutionTitleColor(euiTheme, status) }}
                >
                  {getStatusLabel(status)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                {startedAt ? (
                  <EuiToolTip position="left" content={formattedDate}>
                    <EuiText size="xs" tabIndex={0} color="subdued">
                      <FormattedRelative value={startedAt} />
                    </EuiText>
                  </EuiToolTip>
                ) : (
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="workflows.workflowExecutionListItem.notStarted"
                      defaultMessage="Not started"
                    />
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs" wrap>
              <EuiFlexItem grow={false}>
                <EuiIcon type="clock" color="subdued" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {formattedDuration}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
WorkflowExecutionListItem.displayName = 'WorkflowExecutionListItem';

const componentStyles = {
  selectedContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    }),
  selectableContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
      },
    }),
};
