/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseEuiTheme } from '@elastic/eui';
import { Global, css } from '@emotion/react';
import React from 'react';

/** Print media
 *
 * The code here is designed to be movable outside the domain of Dashboard. Currently,
 * the components and styles are only used by Dashboard but we may choose to move them to,
 * for example, a Kibana package in the future.
 *
 * Any changes to this code must be tested by generating a print-optimized PDF in dashboard.
 */

// A4 page dimensions in mm
const a4PageHeight = '297mm';
const a4PageWidth = '210mm';
const a4PageHeaderHeight = '15mm';
const a4PageFooterHeight = '20mm';

/*
This styling contains utility and minimal layout styles to help plugins create
print-ready HTML.

Observations:
1. We currently do not control the user-agent's header and footer content
   (including the style of fonts) for client-side printing.

2. Page box model is quite different from what we have in browsers - page
   margins define where the "no-mans-land" exists for actual content. Moving
   content into this space by, for example setting negative margins resulted
   in slightly unpredictable behaviour because the browser wants to either
   move this content to another page or it may get split across two
   pages.

3. page-break-* is your friend!
*/

// Currently we cannot control or style the content the browser places in
// margins, this might change in the future:
// See https://drafts.csswg.org/css-page-3/#margin-boxes

const styles = css({
  '@page': {
    size: `${a4PageWidth} ${a4PageHeight}`,
    orientation: 'portrait',
    margin: 0,
    marginTop: a4PageHeaderHeight,
    marginBottom: a4PageFooterHeight,
  },
  '@media print': {
    html: {
      backgroundColor: '#FFF !important',
    },
    // It is good practice to show the full URL in the final, printed output
    ['a[href]:after']: {
      content: '" [" attr(href) "]"',
    },
    figure: {
      pageBreakInside: 'avoid',
    },
    '*': {
      printColorAdjust: 'exact !important',
    },
  },
});

export const GlobalPrintStyles = React.memo(() => <Global styles={styles} />);

const a4PageContentHeight = `calc(${a4PageHeight} - ${a4PageHeaderHeight} - ${a4PageFooterHeight})`;
const a4PageContentWidth = a4PageWidth;

const visualisationsPerPage = 2;
const visPadding = '4mm';

export const printViewportVisStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    '&.printViewport__vis': {
      '@media screen, projection, print': {
        // Open space from page margin
        paddingLeft: visPadding,
        paddingRight: visPadding,

        // Last vis on the page
        [`&:nth-child(${visualisationsPerPage}n)`]: {
          pageBreakAfter: 'always',
          paddingTop: visPadding,
          paddingBottom: visPadding,
        },

        '&:last-child': {
          pageBreakAfter: 'avoid',
        },
        height: `calc(${a4PageContentHeight} / ${visualisationsPerPage})`,
        width: a4PageContentWidth,
        '& .embPanel__header button': {
          display: 'none',
        },
      },
      '@media screen, projection': {
        margin: euiTheme.size.s,
        padding: visPadding,
      },
      '@media print': {
        '.euiPanel': {
          boxShadow: 'none !important',
        },
        pageBreakInside: 'avoid',

        '*': {
          overflow: 'hidden !important',
        },
      },
    },
  });
