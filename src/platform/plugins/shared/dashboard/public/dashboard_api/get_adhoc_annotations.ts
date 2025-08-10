/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';

export function getAdhocAnnotations(alert: { start: string }) {
  return [
    {
      layerId: uuidv4(),
      layerType: 'annotations',
      annotations: [
        {
          label: i18n.translate('dashboard.adhocAnnotation.alertStarted', {
            defaultMessage: 'Alert started',
          }),
          type: 'manual',
          key: {
            type: 'point_in_time',
            timestamp: alert.start,
          },
          icon: 'alert',
          id: uuidv4(),
        },
      ],
    },
  ];
}
