/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { CONTROL_GROUP_TYPE } from '../../common';
import { untilPluginStartServicesReady } from '../services/kibana_services';

export function registerControlGroupEmbeddable(embeddableSetup: EmbeddableSetup) {
  embeddableSetup.registerReactEmbeddableFactory(CONTROL_GROUP_TYPE, async () => {
    const [{ getControlGroupEmbeddableFactory }] = await Promise.all([
      import('./get_control_group_factory'),
      untilPluginStartServicesReady(),
    ]);
    return getControlGroupEmbeddableFactory();
  });
}
