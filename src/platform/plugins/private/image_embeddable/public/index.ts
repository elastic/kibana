/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { declareServices } from '@kbn/core-di';
import { EmbeddableFactoryRegistration } from '@kbn/embeddable-factory-types';
import { ImageEmbeddablePlugin } from './plugin';
import { IMAGE_EMBEDDABLE_TYPE } from '../common/constants';
import { untilPluginStartServicesReady } from './services/kibana_services';

export function plugin() {
  return new ImageEmbeddablePlugin();
}

/**
 * Registers the image embeddable factory globally.
 *
 * The factory entry is bound as a constant; the `getFactory` callback defers
 * actual work until render time, when start services are guaranteed available.
 */
export const services = declareServices(({ publish }) => {
  publish(EmbeddableFactoryRegistration).toConstantValue({
    type: IMAGE_EMBEDDABLE_TYPE,
    getFactory: async () => {
      await untilPluginStartServicesReady();
      const { getImageEmbeddableFactory } = await import(
        './image_embeddable/get_image_embeddable_factory'
      );
      return getImageEmbeddableFactory();
    },
  });
});
