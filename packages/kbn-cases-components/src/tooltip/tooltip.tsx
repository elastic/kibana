/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { FormattedRelative } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiToolTip } from '@elastic/eui';

import { Status } from '../status/status';
import { CaseStatuses } from '../status/types';
import { IconWithCount } from './icon_with_count';
import * as i18n from './translations';

interface Props {
  children: React.ReactNode;
  title: string;
  description: string;
  status: CaseStatuses;
  totalComments: number;
  createAt: string;
  createdBy: { username?: string; fullName?: string };
  dataTestSubj?: string;
  className?: string;
}

const TruncatedText = styled(EuiText)`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  &.title {
    -webkit-line-clamp: 1;
  }
`;

const Footer = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    border-top: 1px solid ${theme.eui.euiTextSubduedColor};
  `}
`;

const CaseTooltipComponent: React.FC<Props> = ({
  title,
  description,
  status,
  totalComments,
  createAt,
  createdBy,
  dataTestSubj,
  children,
  className = '',
}) => {
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
            <TruncatedText className="title">
              <strong>{title}</strong>
            </TruncatedText>
            <TruncatedText>{description}</TruncatedText>
            <EuiSpacer size="xs" />
            <Footer>
              <EuiText>
                {status === CaseStatuses.closed ? i18n.CLOSED : i18n.OPENED}{' '}
                <FormattedRelative value={createAt} /> {i18n.BY}{' '}
                <strong>{createdBy.username || createdBy.fullName}</strong>
              </EuiText>
            </Footer>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <>{children}</>
    </EuiToolTip>
  );
};

CaseTooltipComponent.displayName = 'Tooltip';

export const Tooltip = memo(CaseTooltipComponent);
