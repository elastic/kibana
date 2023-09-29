/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEuiTheme, euiBreakpoint } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * A React hook that provides stateful `css` classes for the {@link Form} component.
 */
export const useFormStyles = () => {
  const euiTheme = useEuiTheme();
  const { size, colors } = euiTheme.euiTheme;

  return {
    cssFormButton: css`
      width: 100%;
    `,
    cssFormUnsavedCount: css`
      ${euiBreakpoint(euiTheme, ['xs'])} {
        display: none;
      }
    `,
    cssFormUnsavedCountMessage: css`
      box-shadow: -${size.xs} 0 ${colors.warning};
      padding-left: ${size.s};
    `,
  };
};
