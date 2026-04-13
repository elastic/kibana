/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';

export const kbdStyles = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  borderColor: euiTheme.colors.borderBaseSubdued,
  borderRadius: euiTheme.border.radius.small,
  borderWidth: euiTheme.border.width.thin,
  borderStyle: 'solid',
  padding: `${euiTheme.size.xxs} ${euiTheme.size.xs}`,
});
