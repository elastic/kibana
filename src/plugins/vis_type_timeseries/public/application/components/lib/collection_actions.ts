/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { ColorRule, TimeseriesVisParams } from '../../../types';

const newFn = (): ColorRule => ({ id: uuid.v1() });

export interface CollectionActionsProps {
  model: TimeseriesVisParams;
  name: keyof TimeseriesVisParams;
  onChange: (partialModel: Partial<TimeseriesVisParams>) => void;
}

export function handleChange(props: CollectionActionsProps, doc: ColorRule) {
  const { model, name } = props;
  const collection = (model[name] as Array<{ id?: string }>) || [];
  const part = { [name]: collection.map((row) => (row.id === doc.id ? doc : row)) };
  props.onChange({ ...model, ...part });
}

export function handleDelete(props: CollectionActionsProps, doc: ColorRule) {
  const { model, name } = props;
  const collection = (model[name] as Array<{ id?: string }>) || [];
  const part = { [name]: collection.filter((row) => row.id !== doc.id) };
  props.onChange?.({ ...model, ...part });
}

export function handleAdd(props: CollectionActionsProps, fn = newFn) {
  const { model, name } = props;
  const collection = (model[name] as Array<{ id?: string }>) || [];
  const part = { [name]: collection.concat([fn()]) };
  props.onChange?.({ ...model, ...part });
}

export const collectionActions = { handleAdd, handleDelete, handleChange };
