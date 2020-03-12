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
import * as t from 'io-ts';

import { idObjectProps } from '../id_object';

export const textObjectTypeName = 'text-object';

/**
 * Takes an array of text objects and sorts them according to date created and places
 * scratch pad at as the first element, if one exists in the array.
 */
export const sortTextObjectsAsc = <O extends Pick<TextObjectWithId, 'isScratchPad' | 'createdAt'>>(
  textObjects: O[]
): O[] =>
  textObjects.sort((a, b) =>
    a.isScratchPad ? -1 : b.isScratchPad ? 1 : a.createdAt - b.createdAt
  );

export const optionalTextObjectProps = {
  /**
   * An optional user provided name for the text object
   */
  name: t.string,

  /**
   * An indication of whether a text object is the scratch pad. This
   * object is special and there should only be one of them. The default
   * should be that the first ever created text object is the scratch pad
   * which cannot be renamed or deleted.
   */
  isScratchPad: t.boolean,

  /**
   * Text value input by the user.
   *
   * Used to re-populate a text editor buffer.
   */
  text: t.string,
};

export const requiredTextObjectProps = {
  /**
   * UNIX timestamp of when the object was created.
   */
  createdAt: t.number,

  /**
   * UNIX timestamp of when the object was last updated.
   */
  updatedAt: t.number,
};

export const textObjectSchema = t.intersection([
  t.type(requiredTextObjectProps),
  t.partial(optionalTextObjectProps),
]);

export const textObjectSchemaWithId = t.intersection([
  t.type({
    ...requiredTextObjectProps,
    ...idObjectProps,
  }),
  t.partial(optionalTextObjectProps),
]);

export type TextObject = t.TypeOf<typeof textObjectSchema>;
export type TextObjectWithId = t.TypeOf<typeof textObjectSchemaWithId>;
