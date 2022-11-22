/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/css';

/** The default max-height of the Add/Edit Filter popover used to show "+n More" filters (e.g. `+4 More`) */
const DEFAULT_MAX_HEIGHT = '233px';

export const filtersBuilderMaxHeight = css`
  max-height: ${DEFAULT_MAX_HEIGHT};
`;

/** @todo: should be removed, no hardcoded sizes **/
export const filterBadgeStyle = css`
  .euiFormRow__fieldWrapper {
    line-height: 1.5;
  }
`;
