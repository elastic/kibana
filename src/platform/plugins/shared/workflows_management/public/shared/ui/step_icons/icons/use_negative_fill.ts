/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';

/**
 * The fill EUI's stylesheet gives `.euiIcon__fillNegative`, as a literal value — these
 * logos get rendered to a data URL, where that class resolves to nothing and their dark
 * segment falls back to black. Mirrors EUI's own expression in `icon.styles.ts`.
 */
export const useNegativeFill = (): string => {
  const { euiTheme, colorMode } = useEuiTheme();
  return colorMode === 'DARK' ? euiTheme.colors.fullShade : euiTheme.colors.darkestShade;
};
