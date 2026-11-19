/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiListGroupItemProps } from '@elastic/eui';
import { EuiListGroup, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { InspectHostConfig } from '../../../../types';

interface Props {
  codeowners: string[];
  getCodeownerHref?: InspectHostConfig['getCodeownerHref'];
}

export const CodeownersList = ({ codeowners, getCodeownerHref }: Props) => {
  const { euiTheme } = useEuiTheme();

  if (codeowners.length === 0) {
    return null;
  }

  const listItems: EuiListGroupItemProps[] = codeowners.map((codeowner) => {
    const href = getCodeownerHref?.(codeowner);

    return {
      label: codeowner,
      ...(href && { href, target: '_blank' }),
      css: css`
        margin-left: -${euiTheme.size.s};
      `,
    };
  });

  const boldTextCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <>
      <EuiText size="s" css={boldTextCss}>
        <FormattedMessage
          id="kbnUI.developerToolbar.inspect.inspectFlyout.dataSection.codeownersTitle"
          defaultMessage="Codeowners:"
        />
      </EuiText>
      <EuiListGroup
        listItems={listItems}
        color="primary"
        data-test-subj="inspectFlyoutCodeownersList"
      />
      <EuiSpacer size="m" />
    </>
  );
};
