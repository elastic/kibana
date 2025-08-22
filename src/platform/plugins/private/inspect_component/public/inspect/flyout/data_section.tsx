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
  EuiCode,
  EuiFlexGroup,
  EuiIcon,
  EuiImage,
  EuiLink,
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

  const { codeowners, euiInfo, iconType, sourceComponent, image } = componentData;

  const listItem: EuiListGroupItemProps[] = codeowners.map((codeowner) => ({
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
      {image && (
        <>
          <EuiImage src={image} alt="Preview" size="fullWidth" hasShadow />
          <EuiSpacer size="l" />
        </>
      )}
      <EuiTitle size="s">
        <h3>
          {sourceComponent ? (
            <EuiCode
              transparentBackground
              css={css`
                color: ${euiTheme.colors.textHeading};
                padding: 0;
              `}
            >
              {sourceComponent}
            </EuiCode>
          ) : (
            <FormattedMessage
              id="kbnInspectComponent.inspectFlyout.componentDataTitle"
              defaultMessage="Data"
            />
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s" css={boldTextCss}>
        <FormattedMessage
          id="kbnInspectComponent.inspectFlyout.codeownersTitle"
          defaultMessage="Codeowners:"
        />
      </EuiText>
      <EuiListGroup listItems={listItem} color="primary" size="s" flush={true} />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiText size="s" css={boldTextCss}>
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
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiText css={boldTextCss} size="s">
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.euiDocsLabel"
            defaultMessage="EUI Docs:"
          />
        </EuiText>
        {euiInfo ? (
          <EuiLink href={euiInfo.docsLink} target="_blank">
            {euiInfo.componentName}
          </EuiLink>
        ) : (
          <EuiText size="s">
            <FormattedMessage
              id="kbnInspectComponent.inspectFlyout.noDocsFound"
              defaultMessage="N/A"
            />
          </EuiText>
        )}
      </EuiFlexGroup>
    </>
  );
};
