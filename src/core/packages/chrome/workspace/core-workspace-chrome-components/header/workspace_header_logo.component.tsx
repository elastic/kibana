/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiHeaderLogoProps } from '@elastic/eui';
import { EuiHeaderLogo, EuiIcon, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export interface WorkspaceHeaderLogoComponentProps
  extends Pick<EuiHeaderLogoProps, 'href' | 'onClick'>,
    Partial<Pick<EuiHeaderLogoProps, 'iconType'>> {
  isLoading?: boolean;
}

const ariaLabel = i18n.translate('core.ui.primaryNav.goToHome.ariaLabel', {
  defaultMessage: 'Go to home page',
});

const DefaultIcon = () => {
  const { euiTheme } = useEuiTheme();

  const style = css`
    & > * {
      stroke: ${euiTheme.colors.textParagraph};
    }
  `;

  return <EuiIcon type="logoElastic" color="text" css={style} size="l" />;
};

export const WorkspaceHeaderLogoComponent = ({
  isLoading,
  iconType: iconTypeProp,
  ...props
}: WorkspaceHeaderLogoComponentProps) => {
  const { euiTheme } = useEuiTheme();
  let iconType = iconTypeProp || DefaultIcon;

  if (isLoading) {
    iconType = () => (
      <EuiLoadingSpinner size="l" aria-hidden={false} data-test-subj="globalLoadingIndicator" />
    );
  }

  return (
    <EuiHeaderLogo
      css={css`
        padding: 0;
        padding-inline: 0;
        margin: 0;
        block-size: ${euiTheme.size.xl};
        line-height: ${euiTheme.size.xl};
        min-inline-size: ${euiTheme.size.xl};
        justify-content: center;
      `}
      iconType={iconType}
      aria-label={ariaLabel}
      {...props}
    />
  );
};
