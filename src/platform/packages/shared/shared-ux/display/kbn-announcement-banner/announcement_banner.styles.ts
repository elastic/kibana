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

const CONTAINER_NAME = 'kbn-announcement-banner';

/** Narrowest possible layout */
const CQC_MAX_NARROW = '(max-width: 360px)';
/** Below this width the layout collapses to a single column. */
const CQC_SUPER_NARROW = '(max-width: 540px)';
const CQC_NARROW = '(min-width: 541px)';
/** At and above this width actions move beside the body and primary appears last. */
const CQC_WIDE = '(min-width: 1000px)';

/** Maximum reading width for `text` and `children` slots. */
const TEXT_MAX_WIDTH = 1200;

export const announcementBannerStyles = {
  root: ({ euiTheme }: UseEuiTheme) => css`
    container-type: inline-size;
    container-name: ${CONTAINER_NAME};
    position: relative;

    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
  `,
  container: ({ euiTheme }: UseEuiTheme) => css`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: ${euiTheme.size.base};
    padding-inline-start: ${euiTheme.size.base};
    padding-inline-end: ${euiTheme.size.base};

    [data-size='m'] & {
      padding-block: ${euiTheme.size.base};
    }

    [data-size='s'] & {
      padding-block: ${euiTheme.size.m};
    }

    @container ${CONTAINER_NAME} ${CQC_SUPER_NARROW} {
      flex-direction: column;
      align-items: stretch;
      gap: ${euiTheme.size.m};
    }
  `,
  media: ({ euiTheme }: UseEuiTheme) => css`
    --kbn-announcementBannerMediaSize: ${`calc(${euiTheme.size.base} * 5)`};

    flex-shrink: 0;
    inline-size: var(--kbn-announcementBannerMediaSize);
    block-size: var(--kbn-announcementBannerMediaSize);
    aspect-ratio: 1 / 1;

    [data-size='l'] & {
      --kbn-announcementBannerMediaSize: ${`calc(${euiTheme.size.base} * 7.5)`};
    }

    [data-size='s'] & {
      --kbn-announcementBannerMediaSize: ${`calc(${euiTheme.size.base} * 2)`};
    }

    img,
    svg {
      block-size: 100%;
      inline-size: 100%;
    }
  `,
  body: ({ euiTheme }: UseEuiTheme) => css`
    flex: 1 1 auto;
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    align-self: center;
    gap: ${euiTheme.size.m};

    [data-size='s'] & {
      gap: ${euiTheme.size.s};
    }

    @container ${CONTAINER_NAME} ${CQC_SUPER_NARROW} {
      align-self: flex-start;
    }

    @container ${CONTAINER_NAME} ${CQC_WIDE} {
      flex-direction: row;
      align-items: center;
      /* stretch to match the media's height so align-items has space to work */
      align-self: stretch;
      justify-content: space-between;
      gap: ${euiTheme.size.l};
    }
  `,
  // At size `s` the content slot becomes a block container so the title and
  // text flow inline. Other sizes keep the flex column with a fixed gap.
  content: ({ euiTheme }: UseEuiTheme) => css`
    flex: 1 1 auto;
    min-inline-size: 0;
    max-inline-size: ${TEXT_MAX_WIDTH}px;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};

    [data-size='s'] & {
      display: block;

      > * + *:not(.euiButtonIcon) {
        margin-block-start: ${euiTheme.size.s};
      }
    }
  `,
  title: css`
    [data-size='s'] & {
      display: inline;
    }
  `,
  text: ({ euiTheme }: UseEuiTheme) => css`
    [data-size='s'] & {
      display: inline;

      /* separator dot between title and text */
      &::before {
        content: '·';
        display: inline-block;
        inline-size: calc(${euiTheme.size.s} + ${euiTheme.size.xxs});
        text-align: center;
        color: ${euiTheme.colors.textHeading};
      }
    }
  `,
  actions: ({ euiTheme }: UseEuiTheme) => css`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: ${euiTheme.size.s};

    @container ${CONTAINER_NAME} ${CQC_MAX_NARROW} {
      /* use full width actions */
      > * {
        inline-size: 100%;
      }
    }

    @container ${CONTAINER_NAME} ${CQC_WIDE} {
      /* Reverses source order so primary appears last (rightmost). */
      flex-direction: row-reverse;
      flex-shrink: 0;
      align-self: flex-end;
    }
  `,
  hasDismiss: ({ euiTheme }: UseEuiTheme) => css`
    @container ${CONTAINER_NAME} ${CQC_NARROW} {
      padding-inline-end: calc(${euiTheme.size.s} * 5);
    }
  `,
  dismiss: ({ euiTheme }: UseEuiTheme) => css`
    position: absolute;
    inset-block-start: ${euiTheme.size.s};
    inset-inline-end: ${euiTheme.size.s};
    color: ${euiTheme.colors.textSubdued};
  `,
};
