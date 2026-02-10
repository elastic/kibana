/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

import type { UseEuiTheme } from '@elastic/eui';
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
        background-color: ${euiTheme.colors.backgroundBasePlain};
        width: 100%;
        height: 100%;
      }

      // remove the border coming from EUI
      .euiFormControlLayoutDelimited::after {
        border: none !important;
      }

      .euiFormControlLayout {
        border: none;
        border-radius: 0;

        // Removes the border that appears on hover
        &:hover {
          z-index: 0 !important;

          .euiFormControlLayout__childrenWrapper {
            outline: none !important;
          }
        }
      }

      .euiFormControlLayout__childrenWrapper {
        border: none;
        box-shadow: none;
        background: ${euiTheme.colors.backgroundBasePlain};

        /** Don't deform the control when rendering the loading spinner. 
        * Instead, render the spinner on top of the control with a light background,
        * ensuring that it covers up the up/down arrow buttons rendered at all times by some browsers.
        * Add 8px of right padding to get it out of the way of the drag handle.
        */
        & .euiFormControlLayoutIcons:last-child {
          position: absolute;
          right: 0;
          padding-right: ${euiTheme.size.s}
          background: ${euiTheme.colors.backgroundBasePlain};
        }
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
      --euiFormControlStateColor: ${euiTheme.colors.textWarning};

      /* But restore the danger color for truly invalid inputs (e.g. min larger than max) */
      &:has(input:invalid) {
        --euiFormControlStateColor: ${euiTheme.colors.textDanger};
      }

      /* Remove the append background so the caution icon looks more natural */
      .euiFormControlLayout__append {
        background-color: transparent;
        // remove the border on the append element
        &::before {
          display: none;
        }
      }

      & input:last-child {
        padding-right: ${euiTheme.size.s} !important; // overwrite edit mode styles
      }
    `,

    editMode: css`
      & input:last-child {
        // ensures that the right up and down arrows are interactable despite drag handle
        padding-right: ${euiTheme.size.base};
      }
    `,

    // Inputs
    fieldNumbers: {
      rangeSliderFieldNumber: css`
        font-weight: ${euiTheme.font.weight.medium};

        &:placeholder-shown,
        &::placeholder {
          font-weight: ${euiTheme.font.weight.regular};
          color: ${euiTheme.colors.textSubdued};
        }
      `,
      invalid: css`
        &:not(:invalid) {
          --euiFormControlStateColor: ${euiTheme.colors.textWarning};
          color: ${euiTheme.colors.textWarning};
        }
        &:invalid {
          --euiFormControlStateColor: ${euiTheme.colors.textDanger};
          color: ${euiTheme.colors.textDanger};
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
