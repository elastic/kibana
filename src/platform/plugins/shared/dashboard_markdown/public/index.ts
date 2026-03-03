/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { declareServices } from '@kbn/core-di';
import { EmbeddableFactoryRegistration } from '@kbn/embeddable-factory-types';
import { DashboardMarkdownPlugin } from './plugin';
import { MARKDOWN_EMBEDDABLE_TYPE } from '../common/constants';

export { MARKDOWN_EMBEDDABLE_TYPE } from '../common/constants';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardMarkdownPlugin();
}

/**
 * Registers the markdown embeddable factory globally.
 */
export const services = declareServices(({ publish }) => {
  publish(EmbeddableFactoryRegistration).toConstantValue({
    type: MARKDOWN_EMBEDDABLE_TYPE,
    getFactory: async () => {
      const { markdownEmbeddableFactory } = await import('./async_services');
      return markdownEmbeddableFactory;
    },
  });
});
