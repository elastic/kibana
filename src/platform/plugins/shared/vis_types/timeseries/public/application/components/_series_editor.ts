/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UseEuiTheme, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

const seriesBodyStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    marginLeft: euiTheme.size.xl,
    marginTop: euiTheme.size.s,
  });

export const useSeriesBodyStyles = () => {
  const euiThemeContext = useEuiTheme();
  const styles = useMemo(() => {
    return seriesBodyStyles(euiThemeContext);
  }, [euiThemeContext]);
  return styles;
};
