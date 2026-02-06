/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type UseEuiTheme, logicalSizeCSS } from '@elastic/eui';

export const getVisualizationListingTableStyles = ({ euiTheme }: UseEuiTheme) => css`
  .visListingTable__typeImage,
  .visListingTable__typeIcon {
    margin-right: ${euiTheme.size.s};
    position: relative;
    top: -1px;
  }

  .visListingTable__typeImage {
    ${logicalSizeCSS(euiTheme.size.base, euiTheme.size.base)};
  }

  .visListingTable__experimentalIcon {
    width: ${euiTheme.size.l};
    vertical-align: middle;
    padding: 0 ${euiTheme.size.s};
    margin-left: ${euiTheme.size.s};
  }
`;
