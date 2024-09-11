/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';

import { UseEuiTheme } from '@elastic/eui';
// @ts-ignore - Kibana has trouble reaching into lib/components for types
import { euiFormControlDefaultShadow } from '@elastic/eui/lib/components/form/form.styles';

export const rangeSliderControlStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  return {
    // Wrapper
    // NOTE: This component is used by a ControlPanel component that already sets its own
    // EuiFormControlLayout, so unfortunately there is some double nesting going on here
    // that we need to account for via height inheritence & unsetting EuiDualRange's
    // form control layout colors/borders
    rangeSliderControl: css`
      &,
      .euiPopover,
      .euiFormControlLayoutDelimited {
        height: 100%;
      }

      .euiFormControlLayout {
        background-color: transparent;
        border: none;
        border-radius: 0;
      }
    `,
    invalid: css`
      /* EUI CSS util for the generating the underline background-image/gradient */
      ${euiFormControlDefaultShadow(euiThemeContext, {
        withBorder: false,
        withBackgroundColor: false,
        withBackgroundAnimation: true,
      })}

      /* Stretch the underline across the entire __childrenWrapper and set it to a custom warning color */
      background-size: 100% 100%;
      --euiFormControlStateColor: ${euiTheme.colors.warning};

      /* But restore the danger color for truly invalid inputs (e.g. min larger than max) */
      &:has(input:invalid) {
        --euiFormControlStateColor: ${euiTheme.colors.danger};
      }

      /* Remove the append background so the caution icon looks more natural */
      .euiFormControlLayout__append {
        background-color: transparent;
      }
    `,

    // Inputs
    fieldNumbers: {
      rangeSliderFieldNumber: css`
        font-weight: ${euiTheme.font.weight.medium};
        background-color: transparent;

        &:placeholder-shown,
        &::placeholder {
          font-weight: ${euiTheme.font.weight.regular};
          color: ${euiTheme.colors.subduedText};
        }
      `,
      invalid: css`
        &:not(:invalid) {
          color: ${euiTheme.colors.warningText};
        }
        &:invalid {
          color: ${euiTheme.colors.dangerText};
        }
      `,
      // unset the red underline for values between steps
      valid: css`
        &:invalid:not(:focus) {
          --euiFormControlStateColor: transparent;
        }
      `,
    },
  };
};
