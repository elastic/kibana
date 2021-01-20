/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Storage } from './storage';

export class StorageMock extends Storage {
  delete = jest.fn();
  decode = jest.fn();
  decodeKey = jest.fn();
  encodeKey = jest.fn();
  encode = jest.fn();
  has = jest.fn();
  keys = jest.fn();
  get = jest.fn();
  set = jest.fn();
}
