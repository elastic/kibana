/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject } from '../../../saved_objects/public';

/**
 * @public
 */
export type TagDecoratedSavedObject = SavedObject & {
  getTags(): string[];
  setTags(tags: string[]): void;
};

/**
 * @internal
 */
export type InternalTagDecoratedSavedObject = TagDecoratedSavedObject & {
  __tags: string[];
};
