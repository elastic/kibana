/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { EuiThemeShape } from '@elastic/eui';

export const cascadedDocumentsStyles = ({ euiTheme }: { euiTheme: EuiThemeShape }) => ({
  wrapper: css({
    '--kbn-data-cascade-cell-border-radius': '0px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    padding: `0 ${euiTheme.size.s} ${euiTheme.size.s}`,

    '& [role="row"] [data-test-subj="dataCascadeInlineStickyHeader"] [data-test-subj="dataGridHeader"]':
      {
        borderBottom: 'none',
        backgroundColor: 'transparent',
      },

    '& [role="row"] [data-test-subj="dataCascadeInlineStickyHeader"] [data-test-subj="discoverCascadeCustomDataPortalledGridHeaderContainer"]':
      {
        padding: `0 ${euiTheme.size.xs}`,
      },
  }),

  textBadge: css({
    textAlign: 'center',
  }),
});
