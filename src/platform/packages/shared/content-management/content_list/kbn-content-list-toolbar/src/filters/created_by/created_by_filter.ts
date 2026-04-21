/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter } from '../part';
import { CreatedByFilterRenderer } from './created_by_filter_renderer';

/**
 * `CreatedByFilter` declarative component for toolbar filter composition.
 *
 * Resolves to a `custom_component` filter using {@link CreatedByFilterRenderer}
 * when the user profiles service is available (`hasCreatedBy` is true).
 */
export const CreatedByFilter = filter.createPreset({
  name: 'createdBy',
  resolve: (_attributes, { hasCreatedBy }) => {
    if (!hasCreatedBy) {
      return undefined;
    }
    return { type: 'custom_component', component: CreatedByFilterRenderer };
  },
});
