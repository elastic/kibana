/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';

export const DimensionEditorSection = ({
  children,
  title,
}: {
  title?: string;
  children?: React.ReactNode | React.ReactNode[];
}) => {
  return (
    <div
      css={css`
        padding-bottom: ${euiThemeVars.euiSize};
        padding-top: ${euiThemeVars.euiSize};
        :first-child {
          padding-top: 0;
          .lnsDimensionEditorSection__border {
            display: none;
          }
        }
      `}
    >
      <div
        className="lnsDimensionEditorSection__border"
        css={css`
          position: relative;
          &:before {
            content: '';
            position: absolute;
            top: -${euiThemeVars.euiSize};
            right: -${euiThemeVars.euiSize};
            left: -${euiThemeVars.euiSize};
            border-top: 1px solid ${euiThemeVars.euiColorLightShade};
          }
        `}
      />
      {title && (
        <EuiTitle
          size="xxs"
          data-test-subj="lnsDimensionEditorSectionHeading"
          css={css`
            padding-bottom: ${euiThemeVars.euiSize};
          `}
        >
          <h3>{title}</h3>
        </EuiTitle>
      )}
      {children}
    </div>
  );
};
