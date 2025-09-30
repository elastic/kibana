/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { ExecutionStatus } from '@kbn/workflows';
import React, { useMemo } from 'react';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { getStatusLabel } from '../../../shared/translations';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { formatDuration } from '../../../shared/lib/format_duration';

interface WorkflowExecutionListItemProps {
  status: ExecutionStatus;
  startedAt: Date | null;
  duration: number | null;
  selected: boolean;
  onClick: null | (() => void);
}

export const WorkflowExecutionListItem = ({
  status,
  startedAt,
  duration,
  selected = false,
  onClick,
}: WorkflowExecutionListItemProps) => {
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

  return (
    <EuiFlexGroup
      component="a"
      css={[
        styles.baseContainer,
        selected && styles.selectedContainer,
        !selected && onClick && styles.selectableContainer,
      ]}
      alignItems="center"
      justifyContent="flexStart"
      onClick={onClick ?? undefined}
      responsive={false}
    >
      <EuiFlexItem css={styles.iconContainer}>
        {getExecutionStatusIcon(euiTheme, status)}
      </EuiFlexItem>
      <EuiFlexItem css={styles.contentContainer}>
        <EuiFlexGroup direction="column" css={styles.content} gutterSize="xs">
          <EuiFlexItem>
            <p
              css={[
                styles.header,
                (status === ExecutionStatus.FAILED || status === ExecutionStatus.CANCELLED) && {
                  color: getExecutionStatusColors(euiTheme, status).color,
                },
              ]}
            >
              {getStatusLabel(status)}
            </p>
          </EuiFlexItem>
          <EuiFlexItem css={styles.timestamp}>
            {startedAt ? (
              <EuiToolTip position="right" content={formattedDate}>
                <FormattedRelative value={startedAt} />
              </EuiToolTip>
            ) : (
              <FormattedMessage
                id="workflows.workflowExecutionListItem.notStarted"
                defaultMessage="Not started"
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <span css={styles.duration}>{formattedDuration}</span>
          </EuiFlexItem>
          {onClick ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type="arrowRight" color={euiTheme.colors.backgroundFilledText} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  baseContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
      borderRadius: euiTheme.border.radius.medium,
      gap: euiTheme.size.m,
      flexGrow: 0,
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    }),
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
  iconContainer: css({
    flexGrow: 0,
    width: '16px',
    height: '16px',
  }),
  contentContainer: css({
    flex: 1,
  }),
  content: (euiThemeContext: UseEuiTheme) =>
    css({
      flexGrow: 0,
      flexShrink: 1,
      fontSize: euiFontSize(euiThemeContext, 's').fontSize,
    }),
  header: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: 'bold',
      color: euiTheme.colors.textParagraph,
    }),
  timestamp: ({ euiTheme }: UseEuiTheme) =>
    css({
      alignSelf: 'flex-start',
      color: euiTheme.colors.textSubdued,
    }),
  duration: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textSubdued,
    }),
};
