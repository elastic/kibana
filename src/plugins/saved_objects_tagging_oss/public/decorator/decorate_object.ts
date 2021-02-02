/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { InternalTagDecoratedSavedObject } from './types';

/**
 * Enhance the object with tag accessors
 */
export const decorateObject = (object: InternalTagDecoratedSavedObject) => {
  object.getTags = () => {
    return object.__tags ?? [];
  };
  object.setTags = (tagIds) => {
    object.__tags = tagIds;
  };
};
