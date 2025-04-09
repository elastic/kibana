/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, COLOR_MODES_STANDARD } from '@elastic/eui';
import { useState, useEffect } from 'react';

const illustrations = {
  noResults: {
    light: () => import('./assets/no_results_light.svg'),
    dark: () => import('./assets/no_results_dark.svg'),
  },
  noSearchResults: {
    light: () => import('./assets/no_search_results_light.svg'),
    dark: () => import('./assets/no_search_results_dark.svg'),
  },
  dashboards: {
    light: () => import('./assets/dashboards_light.svg'),
    dark: () => import('./assets/dashboards_dark.svg'),
  },
  guidedOnboardingPanelBgBottom: {
    light: () => import('./assets/guided_onboarding_panel_bg_bottom_light.svg'),
    dark: () => import('./assets/guided_onboarding_panel_bg_bottom_dark.svg'),
  },
  guidedOnboardingPanelBgTop: {
    light: () => import('./assets/guided_onboarding_panel_bg_top_light.svg'),
    dark: () => import('./assets/guided_onboarding_panel_bg_top_dark.svg'),
  },
  apm: {
    light: () => import('./assets/oblt_apm_light.svg'),
    dark: () => import('./assets/oblt_apm_light.svg'), // No dark variant available
  },
} as const;
export type IllustrationNames = keyof typeof illustrations;

/**
 * Hook to load an SVG illustration dynamically based on the current theme.
 **/
export function useSvgIllustration(name: IllustrationNames): string {
  const { colorMode } = useEuiTheme();
  const [svgPath, setSvgPath] = useState<string>('');
  useEffect(() => {
    const loadIllustration = async () => {
      try {
        const illustration = illustrations[name];
        if (!illustration) {
          throw new Error(`Illustration "${name}" not found.`);
        }

        const loader =
          colorMode === COLOR_MODES_STANDARD.dark ? illustration.dark : illustration.light;
        if (!loader) {
          throw new Error(`Illustration "${name}" is not available for the "${colorMode}" theme.`);
        }

        const module = await loader();
        setSvgPath(module.default);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error loading illustration "${name}":`, err);
      }
    };

    loadIllustration();
  }, [name, colorMode]);

  return svgPath;
}
