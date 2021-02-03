/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import uuid from 'uuid';

const newFn = () => ({ id: uuid.v1() });

export function handleChange(props, doc) {
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.map((row) => {
    if (row.id === doc.id) return doc;
    return row;
  });
  props.onChange?.({ ...model, ...part });
}

export function handleDelete(props, doc) {
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.filter((row) => row.id !== doc.id);
  props.onChange?.({ ...model, ...part });
}

export function handleAdd(props, fn = newFn) {
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.concat([fn()]);
  props.onChange?.({ ...model, ...part });
}

export const collectionActions = { handleAdd, handleDelete, handleChange };
