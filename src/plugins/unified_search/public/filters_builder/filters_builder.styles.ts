/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/css';

export const filtersBuilderCss = (padding: string | null) => css`
  .filter-builder__panel {
    &.filter-builder__panel-nested {
      padding: ${padding} 0;
    }
  }

  .filter-builder__item {
    &.filter-builder__item-nested {
      padding: 0 ${padding};
    }
  }
`;
