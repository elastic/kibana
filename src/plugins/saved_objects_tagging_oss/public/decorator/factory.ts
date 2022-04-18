/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectDecoratorFactory } from '@kbn/saved-objects-plugin/public';
import { InternalTagDecoratedSavedObject } from './types';
import { decorateConfig } from './decorate_config';
import { decorateObject } from './decorate_object';

export const decoratorId = 'tag';

export const tagDecoratorFactory: SavedObjectDecoratorFactory<
  InternalTagDecoratedSavedObject
> = () => {
  return {
    getId: () => decoratorId,
    decorateConfig,
    decorateObject,
  };
};
