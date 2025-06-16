/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VisualizationSavedObject } from '../../common/content_management';
import { isVisTypeReadOnly } from './read_only_vis_type_registry';

export function getInAppUrl(obj: VisualizationSavedObject) {
  let visType: string | undefined;
  if (obj.attributes.visState) {
    try {
      const visState = JSON.parse(obj.attributes.visState);
      visType = visState?.type;
    } catch (e) {
      // let client display warning for unparsable visState
    }
  }

  return isVisTypeReadOnly(visType)
    ? undefined
    : {
        path: `/app/visualize#/edit/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'visualize_v2.show',
      };
}
