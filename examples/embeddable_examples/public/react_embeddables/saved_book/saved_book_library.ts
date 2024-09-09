/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { v4 } from 'uuid';
import { BookAttributes } from './types';

const storage = new Storage(localStorage);

export const loadBookAttributes = async (id: string): Promise<BookAttributes> => {
  await new Promise((r) => setTimeout(r, 500)); // simulate load from network.
  const attributes = storage.get(id) as BookAttributes;
  return attributes;
};

export const saveBookAttributes = async (
  maybeId?: string,
  attributes?: BookAttributes
): Promise<string> => {
  await new Promise((r) => setTimeout(r, 100)); // simulate save to network.
  const id = maybeId ?? v4();
  storage.set(id, attributes);
  return id;
};
