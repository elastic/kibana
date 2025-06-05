/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Theme, css } from '@emotion/react';

export const sectionStyles = {
  blockTitle: ({ euiTheme }: Theme) => ({
    paddingBlock: euiTheme.size.xs,
    paddingInline: euiTheme.size.s,
  }),
  euiCollapsibleNavSection: ({ euiTheme }: Theme) => css`
    & > .euiCollapsibleNavLink {
      /* solution title in primary nav  */
      font-weight: ${euiTheme.font.weight.bold};
      margin: ${euiTheme.size.s} 0;
      margin-bottom: calc(${euiTheme.size.xs} * 1.5);
    }

    .euiCollapsibleNavAccordion {
      &.euiAccordion__triggerWrapper,
      &.euiCollapsibleNavLink {
        &:focus-within {
          background: ${euiTheme.colors.backgroundBasePlain};
        }

        &:hover {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      }

      &.isSelected {
        .euiAccordion__triggerWrapper,
        .euiCollapsibleNavLink {
          background-color: ${euiTheme.colors.backgroundLightPrimary};

          * {
            color: ${euiTheme.colors.textPrimary};
          }
        }
      }
    }

    .euiAccordion__children .euiCollapsibleNavItem__items {
      padding-inline-start: ${euiTheme.size.m};
      margin-inline-start: ${euiTheme.size.m};
    }

    &:only-child .euiCollapsibleNavItem__icon {
      transform: scale(1.33);
    }
  `,
  euiCollapsibleNavSubItem: ({ euiTheme }: Theme) => css`
    .euiAccordion__button:focus,
    .euiAccordion__button:hover {
      text-decoration: none;
    }

    &.euiLink,
    &.euiCollapsibleNavLink {
      &:focus,
      &:hover {
        background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        text-decoration: none;
      }

      &.isSelected {
        background-color: ${euiTheme.colors.backgroundLightPrimary};
        &:focus,
        &:hover {
          background-color: ${euiTheme.colors.backgroundLightPrimary};
        }

        * {
          color: ${euiTheme.colors.textPrimary};
        }
      }
    }
  `,
  euiAccordionChildWrapper: ({ euiTheme }: Theme) => css`
    .euiAccordion__childWrapper {
      background-color: ${euiTheme.colors.backgroundBasePlain};
      transition: none; // Remove the transition as it does not play well with dynamic links added to the accordion
    }
  `,
};
