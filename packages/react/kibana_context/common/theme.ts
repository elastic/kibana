/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiThemeSystem } from '@elastic/eui';
import { EuiThemeAmsterdam } from '@elastic/eui';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { EuiThemeBorealis as EuiThemeBorealisGrey } from '@elastic/eui-theme-borealis-grey';
import { ThemeVersion } from '@kbn/ui-shared-deps-npm';

export interface ThemeDescriptor {
  euiTheme: EuiThemeSystem;
}

export const KIBANA_THEMES: Record<ThemeVersion, ThemeDescriptor> = {
  v8: {
    euiTheme: EuiThemeAmsterdam,
  },
  borealis: {
    euiTheme: EuiThemeBorealis,
  },
  borealisgrey: {
    euiTheme: EuiThemeBorealisGrey,
  },
};

export const getKibanaThemeByVersion = (version: ThemeVersion) => KIBANA_THEMES[version];
