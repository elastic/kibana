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

export const esqlCascadeStyles = ({ euiTheme }: { euiTheme: EuiThemeShape }) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    padding: euiTheme.size.s,
  }),
});
