/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiHorizontalRule } from '@elastic/eui';

import { Status } from '../status/status';
import { CaseStatuses } from '../status/types';
import { IconWithCount } from './icon_with_count';
import { getTruncatedText } from './utils';
import * as i18n from './translations';
import type { CaseTooltipContentProps } from './types';

const TITLE_TRUNCATE_LENGTH = 35;
const DESCRIPTION_TRUNCATE_LENGTH = 80;
const USER_TRUNCATE_LENGTH = 15;

const CaseTooltipContentComponent = React.memo<CaseTooltipContentProps>(
  ({ title, description, status, totalComments, createdAt, createdBy }) => (
    <>
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <Status status={status} />
          </EuiFlexItem>
          <IconWithCount count={totalComments} icon={'editorComment'} />
        </EuiFlexGroup>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText size="relative">
              <strong>{getTruncatedText(title, TITLE_TRUNCATE_LENGTH)}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="relative">
              {getTruncatedText(description, DESCRIPTION_TRUNCATE_LENGTH)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiText size="relative">
        {status === CaseStatuses.closed ? i18n.CLOSED : i18n.OPENED}{' '}
        <FormattedRelative value={createdAt} />{' '}
        {createdBy.username || createdBy.fullName ? (
          <>
            {i18n.BY}{' '}
            <strong data-test-subj="tooltip-username">
              {getTruncatedText(
                createdBy.username ?? createdBy.fullName ?? '',
                USER_TRUNCATE_LENGTH
              )}
            </strong>
          </>
        ) : null}
      </EuiText>
    </>
  )
);

CaseTooltipContentComponent.displayName = 'TooltipContent';

export const TooltipContent = memo(CaseTooltipContentComponent);
