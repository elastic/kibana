/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { Status } from '../status/status';
import { CaseStatuses } from '../status/types';
import { IconWithCount } from './icon_with_count';
import * as i18n from './translations';

interface TooltipProps {
  title: string;
  description: string;
  status: CaseStatuses;
  totalComments: number;
  createdAt: string;
  createdBy: { username?: string; fullName?: string };
  dataTestSubj?: string;
  className?: string;
  children: React.ReactNode;
}
const CaseTooltipComponent = React.memo<TooltipProps>(
  ({
    title,
    description,
    status,
    totalComments,
    createdAt,
    createdBy,
    dataTestSubj,
    children,
    className = '',
  }) => {
    const { euiTheme } = useEuiTheme();
    const commonTextStyles: React.CSSProperties = {
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    };
    const borderColor = euiTheme.colors.subduedText;

    return (
      <EuiToolTip
        data-test-subj={dataTestSubj ? dataTestSubj : 'cases-components-tooltip'}
        anchorClassName={className}
        content={
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="spaceBetween">
                <Status status={status} />
                <IconWithCount count={totalComments} icon={'editorComment'} />
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiText style={{ ...commonTextStyles, WebkitLineClamp: 1 }}>
                <strong>{title}</strong>
              </EuiText>
              <EuiText style={{ ...commonTextStyles, WebkitLineClamp: 2 }}>{description}</EuiText>
              <EuiSpacer size="xs" />
              <EuiText style={{ borderTop: `1px solid ${borderColor}` }}>
                <EuiSpacer size="xs" />
                {status === CaseStatuses.closed ? i18n.CLOSED : i18n.OPENED}{' '}
                <FormattedRelative value={createdAt} /> {i18n.BY}{' '}
                <strong data-test-subj="tooltip-username">
                  {createdBy.username || createdBy.fullName || ''}
                </strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <>{children}</>
      </EuiToolTip>
    );
  }
);

CaseTooltipComponent.displayName = 'Tooltip';

export const Tooltip = memo(CaseTooltipComponent);
