/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getReducedSpaceStyling = () => {
  return `
  /* Use grid display instead of standard table display CSS */
        .euiTable thead,
        .euiTable tbody {
          display: block;
        }
        .euiTable thead tr {
          display: grid;
          grid-template-columns: 40px 1fr 0 auto 72px;
        }
        .euiTable tbody tr {
          display: grid;
          grid-template-columns: 40px 1fr auto 72px;
          grid-template-areas:
            'status timeRan lastDuration actions'
            '. queryString queryString queryString';
        }
        /* Set grid template areas */
        .euiTable td[data-test-subj='status'] {
          grid-area: status;
        }
        .euiTable td[data-test-subj='timeRan'] {
          grid-area: timeRan;
        }
        .euiTable td[data-test-subj='lastDuration'] {
          grid-area: lastDuration;
        }
        .euiTable td[data-test-subj='actions'] {
          grid-area: actions;
        }
        /**
   * Special full-width cell that comes after all other cells
   */
        .euiTable td[data-test-subj='queryString'] {
          grid-area: queryString;
          border: 0;
          .euiTableCellContent {
            padding-top: 0;
          }
        }
        /* Unset the border between this cell and other cells */
        .euiTable .euiTableRowCell:not([data-test-subj='queryString']) {
          border-bottom: 0;
        }
  `;
};
