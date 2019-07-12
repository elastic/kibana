/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import uuid from 'uuid';
import _ from 'lodash';

const newFn = () => ({ id: uuid.v1() });

export function handleChange(props, doc) {
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.map(row => {
    if (row.id === doc.id) return doc;
    return row;
  });
  if (_.isFunction(props.onChange)) {
    props.onChange(_.assign({}, model, part));
  }
}

export function handleDelete(props, doc) {
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.filter(row => row.id !== doc.id);
  if (_.isFunction(props.onChange)) {
    props.onChange(_.assign({}, model, part));
  }
}

export function handleAdd(props, fn = newFn) {
  if (!_.isFunction(fn)) fn = newFn;
  const { model, name } = props;
  const collection = model[name] || [];
  const part = {};
  part[name] = collection.concat([fn()]);
  if (_.isFunction(props.onChange)) {
    props.onChange(_.assign({}, model, part));
  }
}

export const collectionActions = { handleAdd, handleDelete, handleChange };
