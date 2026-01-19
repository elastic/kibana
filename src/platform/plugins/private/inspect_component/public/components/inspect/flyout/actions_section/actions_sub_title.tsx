/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { CopyRelativePathButton } from './copy_relative_path_button';

interface Props {
  relativePath: string;
  baseFileName: string;
}

export const ActionsSubTitle = ({ relativePath, baseFileName }: Props) => {
  const { euiTheme } = useEuiTheme();

  const boldTextCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiText component="div" size="s" data-test-subj="inspectComponentActionsSubtitle">
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.actionsSection.subtitle"
            defaultMessage="Open {baseFileName}"
            values={{
              baseFileName: (
                <EuiText size="s" component="span" css={boldTextCss}>
                  {baseFileName}
                </EuiText>
              ),
            }}
          />
        </EuiText>
        <CopyRelativePathButton relativePath={relativePath} />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
