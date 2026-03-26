/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

// The `--kbn-application--content-height` CSS variable is automatically updated by chrome's layout system
// to reflect the height of the application container, minus any fixed headers or footers.
export const kbnFullBodyHeightCss = (additionalOffset = '0px') =>
  css({
    height: `calc(var(--kbn-application--content-height) - ${additionalOffset})`,
  });
