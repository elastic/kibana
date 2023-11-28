/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';

interface DocType {
  id: string;
  type?: string;
}

const newFn = (): DocType => ({ id: uuidv4() });

export interface CollectionActionsProps<T> {
  model: T;
  name: keyof T;
  onChange: (partialModel: Partial<T>) => void;
}

export function handleChange<T, P extends DocType>(props: CollectionActionsProps<T>, doc: P) {
  const { model, name } = props;
  const collection = (model[name] as unknown as DocType[]) || [];
  const part = { [name]: collection.map((row) => (row.id === doc.id ? doc : row)) };
  props.onChange({ ...model, ...part });
}

export function handleDelete<T, P extends DocType>(props: CollectionActionsProps<T>, doc: P) {
  const { model, name } = props;
  const collection = (model[name] as unknown as DocType[]) || [];
  const part = { [name]: collection.filter((row) => row.id !== doc.id) };
  props.onChange?.({ ...model, ...part });
}

export function handleAdd<T>(props: CollectionActionsProps<T>, fn = newFn) {
  const { model, name } = props;
  const collection = (model[name] as unknown as DocType[]) || [];
  const part = { [name]: collection.concat([fn()]) };
  props.onChange?.({ ...model, ...part });
}

export const collectionActions = { handleAdd, handleDelete, handleChange };
