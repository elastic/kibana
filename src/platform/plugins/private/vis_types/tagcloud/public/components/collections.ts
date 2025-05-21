/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { TagCloudVisParams } from '../types';

interface Scales {
  text: string;
  value: TagCloudVisParams['scale'];
}

interface Orientation {
  text: string;
  value: TagCloudVisParams['orientation'];
}

interface Collections {
  scales: Scales[];
  orientations: Orientation[];
}

export const collections: Collections = {
  scales: [
    {
      text: i18n.translate('visTypeTagCloud.scales.linearText', {
        defaultMessage: 'Linear',
      }),
      value: 'linear',
    },
    {
      text: i18n.translate('visTypeTagCloud.scales.logText', {
        defaultMessage: 'Log',
      }),
      value: 'log',
    },
    {
      text: i18n.translate('visTypeTagCloud.scales.squareRootText', {
        defaultMessage: 'Square root',
      }),
      value: 'square root',
    },
  ],
  orientations: [
    {
      text: i18n.translate('visTypeTagCloud.orientations.singleText', {
        defaultMessage: 'Single',
      }),
      value: 'single',
    },
    {
      text: i18n.translate('visTypeTagCloud.orientations.rightAngledText', {
        defaultMessage: 'Right angled',
      }),
      value: 'right angled',
    },
    {
      text: i18n.translate('visTypeTagCloud.orientations.multipleText', {
        defaultMessage: 'Multiple',
      }),
      value: 'multiple',
    },
  ],
};
