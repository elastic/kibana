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
import { trimIdPrefix } from './trim_id_prefix';
import uuid from 'uuid';

export class DefaultDocumentFormat {

  fromDocument({
    extraDocumentProperties,
    doc
  }) {

    const { type, updated_at: updatedAt } = doc._source;
    return {
      id: this.fromDocumentId(type, doc._id),
      type,
      ...updatedAt && { updated_at: updatedAt },
      version: doc._version,
      ...extraDocumentProperties
        .map(s => ({ [s]: doc._source[s] }))
        .reduce((acc, prop) => ({ ...acc, ...prop }), {}),
      attributes: {
        ...doc._source[type],
      },
    };
  }

  fromDocumentId(type, id) {
    return trimIdPrefix(id, type);
  }

  toDocumentId(type, id) {
    return `${type}:${id || uuid.v1()}`;
  }

  toDocumentSource({
    type,
    extraDocumentProperties,
    updatedAt,
    attributes
  }) {
    return {
      ...extraDocumentProperties,
      type: this.toDocumentSourceType(type),
      updated_at: updatedAt,
      [type]: attributes,
    };
  }

  toDocumentSourceType(type) {
    return type;
  }
}
