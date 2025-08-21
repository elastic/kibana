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
import {
  EuiFlexGroup,
  EuiIcon,
  EuiListGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { ComponentData } from '../../types';

interface Props {
  componentData: ComponentData;
}

export const DataSection = ({ componentData }: Props) => {
  const { euiTheme } = useEuiTheme();

  if (!componentData) return null;

  const { codeowners, iconType } = componentData;

  const listItem: EuiListGroupItemProps[] = codeowners.map((codeowner) => ({
    label: codeowner,
    size: 's',
    href: `https://github.com/orgs/elastic/teams/${codeowner.slice('@elastic/'.length)}`,
    target: '_blank',
    css: css`
      margin-left: -${euiTheme.size.s};
    `,
  }));

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.componentDataTitle"
            defaultMessage="Data"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
        `}
      >
        <FormattedMessage
          id="kbnInspectComponent.inspectFlyout.codeownersTitle"
          defaultMessage="Codeowners:"
        />
      </EuiText>
      <EuiListGroup listItems={listItem} color="primary" size="s" flush={true} />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiText
          size="s"
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.iconTypeLabel"
            defaultMessage="Icon:"
          />
        </EuiText>
        <EuiText size="s">
          {iconType ? (
            iconType
          ) : (
            <FormattedMessage
              id="kbnInspectComponent.inspectFlyout.noIconTypeFound"
              defaultMessage="N/A"
            />
          )}
        </EuiText>
        {iconType && <EuiIcon type={iconType} size="m" />}
      </EuiFlexGroup>
    </>
  );
};
