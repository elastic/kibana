/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, useEuiTheme } from '@elastic/eui';

import { Status } from '../status/status';
import { CaseStatuses } from '../status/types';
import { IconWithCount } from './icon_with_count';
import { getTruncatedText } from './utils';
import * as i18n from './translations';
import type { CaseTooltipProps } from './types';

const TITLE_TRUNCATE_LENGTH = 35;
const DESCRIPTION_TRUNCATE_LENGTH = 80;

const CaseTooltipContentComponent = React.memo<CaseTooltipProps>(
  ({ title, description, status, totalComments, createdAt, createdBy }) => {
    const { euiTheme } = useEuiTheme();
    const borderColor = euiTheme.colors.subduedText;

    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <Status status={status} />
            <IconWithCount count={totalComments} icon={'editorComment'} />
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

          <EuiText size="relative">
            <strong>{getTruncatedText(title, TITLE_TRUNCATE_LENGTH)}</strong>
          </EuiText>
          <EuiText size="relative">
            {getTruncatedText(description, DESCRIPTION_TRUNCATE_LENGTH)}
          </EuiText>

          <EuiSpacer size="xs" />

          <EuiText style={{ borderTop: `1px solid ${borderColor}` }} size="relative">
            <EuiSpacer size="xs" />
            {status === CaseStatuses.closed ? i18n.CLOSED : i18n.OPENED}{' '}
            <FormattedRelative value={createdAt} />{' '}
            {createdBy.username || createdBy.fullName ? (
              <>
                {i18n.BY}{' '}
                <strong data-test-subj="tooltip-username">
                  {createdBy.username || createdBy.fullName}
                </strong>
              </>
            ) : (
              ''
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

CaseTooltipContentComponent.displayName = 'TooltipContent';

export const TooltipContent = memo(CaseTooltipContentComponent);
