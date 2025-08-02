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

export const dataTableStyles = {
  loadingAndEmpty: css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flex: '1 0 100%',
    height: '100%',
    width: '100%',
  }),
  dataTableInner: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      flexWrap: 'nowrap',
      height: '100%',

      '& .euiDataGrid__content': {
        background: 'transparent',
      },

      '& .euiDataGrid--bordersHorizontal .euiDataGridHeader': {
        borderTop: 'none',
      },

      '& .euiDataGrid--headerUnderline .euiDataGridHeader': {
        borderBottom: euiTheme.border.thin,
      },

      '& .euiDataGridRowCell--controlColumn .euiDataGridRowCell__content, & .euiDataGridRowCell.euiDataGridRowCell--controlColumn[data-gridcell-column-id="openDetails"], & .euiDataGridRowCell.euiDataGridRowCell--controlColumn[data-gridcell-column-id="select"], & .euiDataGridRowCell.euiDataGridRowCell--controlColumn[data-gridcell-column-id^="additionalRowControl_"], & .euiDataGridHeaderCell.euiDataGridHeaderCell--controlColumn[data-gridcell-column-id^="additionalRowControl_"]':
        {
          paddingLeft: 0,
          paddingRight: 0,
          borderLeft: 0,
          borderRight: 0,
        },

      '& .euiDataGridRowCell.euiDataGridRowCell--controlColumn[data-gridcell-column-id="additionalRowControl_menuControl"] .euiDataGridRowCell__content':
        {
          paddingBottom: 0,
        },

      '& .euiDataGridHeaderCell.euiDataGridHeaderCell--controlColumn[data-gridcell-column-id="select"]':
        {
          paddingLeft: euiTheme.size.xs,
          paddingRight: 0,
        },

      '& .euiDataGridHeaderCell.euiDataGridHeaderCell--controlColumn[data-gridcell-column-id="colorIndicator"], & .euiDataGridRowCell.euiDataGridRowCell--controlColumn[data-gridcell-column-id="colorIndicator"]':
        {
          padding: 0,
          borderLeft: 0,
          borderRight: 0,
        },

      '& .euiDataGridRowCell.euiDataGridRowCell--controlColumn[data-gridcell-column-id="colorIndicator"] .euiDataGridRowCell__content':
        {
          height: '100%',
          borderBottom: 0,
        },

      '& .euiDataGrid--rowHoverHighlight .euiDataGridRow:hover': {
        backgroundColor: euiTheme.colors.lightestShade, // we keep using a deprecated shade until a proper token is available
      },

      '& .euiDataGrid__scrollOverlay .euiDataGrid__scrollBarOverlayRight': {
        backgroundColor: 'transparent', // otherwise the grid scrollbar border visually conflicts with the grid toolbar controls
      },

      '& .euiDataGridRowCell__content--autoHeight, & .euiDataGridRowCell__content--lineCountHeight, & .euiDataGridHeaderCell__content':
        {
          whiteSpace: 'pre-wrap',
        },
    }),
  dataTable: css({
    flexGrow: 1,
    flexShrink: 0,
    minHeight: 0,
  }),
};
