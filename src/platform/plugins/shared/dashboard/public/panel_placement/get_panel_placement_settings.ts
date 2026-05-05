/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PanelSettings } from '@kbn/presentation-util-plugin/public';
import { presentationUtilService } from '../services/kibana_services';

export async function getPanelSettings(
  embeddableType: string,
  serializedState?: object
): Promise<undefined | PanelSettings> {
  try {
    return await presentationUtilService.getPanelPlacementSettings(embeddableType, serializedState);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unable to get panel placement settings; embeddableType: ${embeddableType}, serializedState: ${serializedState}, error: ${e}`
    );
  }
}
