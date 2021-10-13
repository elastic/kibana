/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentProps, FC } from 'react';
import { Settings } from '@elastic/charts';
import { ThemeService } from '../theme';

type EuiChartSettingsProps = ComponentProps<typeof Settings>;

export const getEuiChartSettings = ({
  useChartsTheme,
  useChartsBaseTheme,
}: ThemeService): FC<EuiChartSettingsProps> => {
  return function SharedChartSettings({ theme: userTheme = [], baseTheme, ...rest }) {
    const userThemes = Array.isArray(userTheme) ? userTheme : [userTheme];
    return (
      <Settings
        {...rest}
        theme={[...userThemes, useChartsTheme()]}
        baseTheme={baseTheme ?? useChartsBaseTheme()}
      />
    );
  };
};

export type SharedChartSettings = ReturnType<typeof getEuiChartSettings>;
