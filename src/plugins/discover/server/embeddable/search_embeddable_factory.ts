/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/server';
import { extract, inject } from '../../common/embeddable';

export const createSearchEmbeddableFactory = (): EmbeddableRegistryDefinition => ({
  id: SEARCH_EMBEDDABLE_TYPE,
  inject,
  extract,
});
