/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InternalTagDecoratedSavedObject } from './types';
import { decorateObject } from './decorate_object';

const createObject = (): InternalTagDecoratedSavedObject => {
  // we really just need TS not to complain here.
  return {} as InternalTagDecoratedSavedObject;
};

describe('decorateObject', () => {
  it('adds the `getTags` method', () => {
    const object = createObject();
    object.__tags = ['foo', 'bar'];

    decorateObject(object);

    expect(object.getTags).toBeDefined();
    expect(object.getTags()).toEqual(['foo', 'bar']);
  });

  it('adds the `setTags` method', () => {
    const object = createObject();
    object.__tags = ['foo', 'bar'];

    decorateObject(object);

    expect(object.setTags).toBeDefined();

    object.setTags(['hello', 'dolly']);

    expect(object.getTags()).toEqual(['hello', 'dolly']);
  });
});
