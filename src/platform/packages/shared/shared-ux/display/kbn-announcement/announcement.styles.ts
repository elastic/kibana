/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

const CONTAINER_NAME = 'kbn-announcement';

/** Below this width the layout collapses to a single column. */
const CQC_SUPER_NARROW = '(max-width: 580px)';

/** At and above this width actions move beside the body and primary appears last. */
const CQC_WIDE = '(min-width: 1400px)';

/** Maximum reading width for `text` and `children` slots. */
const TEXT_MAX_WIDTH = 1200;

interface UseAnnouncementStylesArgs {
  hasDismiss: boolean;
}

/**
 * Returns Emotion styles for the announcement component.
 */
export const useAnnouncementStyles = ({ hasDismiss }: UseAnnouncementStylesArgs) => {
  const { euiTheme } = useEuiTheme();

  const rootInlineEndSpacing = hasDismiss ? `calc(${euiTheme.size.base} * 3)` : euiTheme.size.base;

  const root = css`
    container-type: inline-size;
    container-name: ${CONTAINER_NAME};
    position: relative;
    padding-block: ${euiTheme.size.base};
    padding-inline-start: ${euiTheme.size.base};
    padding-inline-end: ${rootInlineEndSpacing};
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  const container = css`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: ${euiTheme.size.base};

    @container ${CONTAINER_NAME} ${CQC_WIDE} {
      gap: calc(${euiTheme.size.base} * 1.5);

      [data-size='s'] & {
        gap: ${euiTheme.size.base};
      }
    }

    @container ${CONTAINER_NAME} ${CQC_SUPER_NARROW} {
      flex-direction: column;
      align-items: stretch;

      [data-size='s'] & {
        gap: ${euiTheme.size.m};
      }
    }
  `;

  const media = css`
    --kbn-announcementMediaSize: ${`calc(${euiTheme.size.base} * 5)`};

    flex-shrink: 0;
    inline-size: var(--kbn-announcementMediaSize);
    block-size: var(--kbn-announcementMediaSize);
    aspect-ratio: 1 / 1;

    [data-size='l'] & {
      --kbn-announcementMediaSize: ${`calc(${euiTheme.size.base} * 7.5)`};
    }

    [data-size='s'] & {
      --kbn-announcementMediaSize: ${`calc(${euiTheme.size.base} * 2)`};
    }
  `;

  const body = css`
    flex: 1 1 auto;
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};

    [data-size='s'] & {
      gap: ${euiTheme.size.s};
    }

    @container ${CONTAINER_NAME} ${CQC_WIDE} {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: ${euiTheme.size.l};
      /* stretch to match the media's height so align-items has space to work */
      align-self: stretch;
    }
  `;

  // At size `s` the content slot becomes a block container so the title and
  // text flow inline. Other sizes keep the flex column with a fixed gap.
  const content = css`
    flex: 1 1 auto;
    min-inline-size: 0;
    max-inline-size: ${TEXT_MAX_WIDTH}px;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};

    [data-size='s'] & {
      display: block;

      > * + * {
        margin-block-start: ${euiTheme.size.s};
      }
    }
  `;

  const title = css`
    [data-size='s'] & {
      display: inline;

      &::after {
        content: '.';
      }
    }
  `;

  const text = css`
    [data-size='s'] & {
      display: inline;
      margin-inline-start: ${euiTheme.size.s};
    }
  `;

  const actions = css`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: ${euiTheme.size.s};

    @container ${CONTAINER_NAME} ${CQC_WIDE} {
      /* Reverses source order so primary appears last (rightmost). */
      flex-direction: row-reverse;
      flex-shrink: 0;
      align-self: flex-end;
    }
  `;

  const dismiss = css`
    /* it seems it might change depending on 'size' and cqc */
    --kbn-announcementDismissButtonPosition: ${euiTheme.size.s};

    position: absolute;
    inset-block-start: var(--kbn-announcementDismissButtonPosition);
    inset-inline-end: var(--kbn-announcementDismissButtonPosition);
  `;

  return { root, container, media, body, content, title, text, actions, dismiss };
};
