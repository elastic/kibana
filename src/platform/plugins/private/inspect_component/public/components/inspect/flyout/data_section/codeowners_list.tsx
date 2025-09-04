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

interface Props {
  codeowners: string[];
}

export const CodeownersList = ({ codeowners }: Props) => {
  const { euiTheme } = useEuiTheme();

  if (codeowners.length === 0) {
    return null;
  }

  const listItems: EuiListGroupItemProps[] = codeowners.map((codeowner) => ({
    label: codeowner,
    size: 's',
    href: `https://github.com/orgs/elastic/teams/${codeowner.slice('@elastic/'.length)}`,
    target: '_blank',
    css: css`
      margin-left: -${euiTheme.size.s};
    `,
  }));

  const boldTextCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <>
      <EuiText size="s" css={boldTextCss}>
        <FormattedMessage
          id="kbnInspectComponent.inspectFlyout.dataSection.codeownersTitle"
          defaultMessage="Codeowners:"
        />
      </EuiText>
      <EuiListGroup
        listItems={listItems}
        color="primary"
        size="s"
        flush={true}
        data-test-subj="inspectFlyoutCodeownersList"
      />
      <EuiSpacer size="m" />
    </>
  );
};
