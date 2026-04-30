/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const LENS_ACTION_ID = 'addLensPanelAction';
const ESQL_CHART_ACTION_ID = 'ACTION_CREATE_ESQL_CHART';

export const FeaturedActionIds = [LENS_ACTION_ID, ESQL_CHART_ACTION_ID] as const;

export const FeaturedItems: Readonly<{
  [Key in (typeof FeaturedActionIds)[number]]: {
    title: string;
    description: string;
    icon: IconType;
  };
}> = {
  [LENS_ACTION_ID]: {
    title: i18n.translate('dashboard.addPanelFlyout.featured.visualizationTitle', {
      defaultMessage: 'Visualization',
    }),
    description: i18n.translate('dashboard.addPanelFlyout.featured.visualizationDescription', {
      defaultMessage: 'Build charts, metrics, and tables with a point-and-click editor.',
    }),
    icon: 'visBarVertical',
  },
  [ESQL_CHART_ACTION_ID]: {
    title: i18n.translate('dashboard.addPanelFlyout.featured.esqlVisualizationTitle', {
      defaultMessage: 'Visualization (query)',
    }),
    description: i18n.translate('dashboard.addPanelFlyout.featured.esqlVisualizationDescription', {
      defaultMessage: 'Build charts, metrics, and tables with ES|QL.',
    }),
    icon: 'editorCodeBlock',
  },
} as const;
