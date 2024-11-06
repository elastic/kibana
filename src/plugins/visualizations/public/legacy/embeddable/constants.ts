/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export { VISUALIZE_EMBEDDABLE_TYPE } from '../../../common/constants';

export const COMMON_VISUALIZATION_GROUPING = [
  {
    id: 'visualizations',
    getDisplayName: () =>
      i18n.translate('visualizations.common.constants.grouping.legacy', {
        defaultMessage: 'Visualizations',
      }),
    getIconType: () => {
      return 'visGauge';
    },
    order: 1000,
  },
];
