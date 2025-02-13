/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/server';

import { RANGE_SLIDER_CONTROL } from '../../common';
import {
  createRangeSliderExtract,
  createRangeSliderInject,
} from './range_slider_persistable_state';

export const rangeSliderPersistableStateServiceFactory = (): EmbeddableRegistryDefinition => {
  return {
    id: RANGE_SLIDER_CONTROL,
    extract: createRangeSliderExtract(),
    inject: createRangeSliderInject(),
  };
};
