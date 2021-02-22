/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectDecoratorConfig } from '../../../saved_objects/public';
import { tagDecoratorFactory, decoratorId } from './factory';
import { InternalTagDecoratedSavedObject } from './types';

export { TagDecoratedSavedObject } from './types';

export const tagDecoratorConfig: SavedObjectDecoratorConfig<InternalTagDecoratedSavedObject> = {
  id: decoratorId,
  priority: 100,
  factory: tagDecoratorFactory,
};
