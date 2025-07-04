/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle, UseEuiTheme } from '@elastic/eui';
import React from 'react';

export const DimensionEditorSection = ({
  children,
  title,
}: {
  title?: string;
  children?: React.ReactNode | React.ReactNode[];
}) => {
  return (
    <div css={DimensionEditorSectionStyles.self}>
      <div css={DimensionEditorSectionStyles.divider} />
      {title && (
        <EuiTitle
          size="xxs"
          data-test-subj="lnsDimensionEditorSectionHeading"
          css={DimensionEditorSectionStyles.heading}
        >
          <h3>{title}</h3>
        </EuiTitle>
      )}
      {children}
    </div>
  );
};

const DimensionEditorSectionStyles = {
  self: ({ euiTheme }: UseEuiTheme) => `
    padding-bottom: ${euiTheme.size.base};
    padding-top: ${euiTheme.size.base};
    &:first-child {
      padding-top: 0;
    }
  `,
  divider: ({ euiTheme }: UseEuiTheme) => `
    position: relative;
    &:before {
      content: '';
      position: absolute;
      top: -${euiTheme.size.base};
      right: -${euiTheme.size.base};
      left: -${euiTheme.size.base};
      border-top: 1px solid ${euiTheme.colors.lightShade};
    }
  `,
  heading: ({ euiTheme }: UseEuiTheme) => `
    padding-bottom: ${euiTheme.size.base};
  `,
};
