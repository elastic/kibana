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
import { Reducer } from 'react';
import { produce } from 'immer';
import { exact } from 'io-ts';
import {
  textObjectSchemaWithId,
  TextObjectWithId,
  TextObject,
  throwIfUnknown,
} from '../../../common/text_object';
import { IdObject } from '../../../common/id_object';

const exactTextObjectSchema = exact(textObjectSchemaWithId);

export interface Store {
  saving: boolean;
  currentTextObjectId: string;
  textObjects: Record<string, TextObjectWithId>;
  textObjectsSaveError: Record<string, Error | string>;
}

export const initialValue: Store = {
  saving: false,
  currentTextObjectId: '',
  textObjects: {},
  textObjectsSaveError: {},
};

export type Action =
  | { type: 'setSaving'; payload: boolean }
  | { type: 'setCurrent'; payload: string }
  | { type: 'upsertMany'; payload: Array<Partial<TextObject> & IdObject> }
  | { type: 'upsert'; payload: Partial<TextObject> & IdObject }
  | { type: 'upsertAndSetCurrent'; payload: TextObjectWithId }
  | { type: 'delete'; payload: string }
  | { type: 'saveError'; payload: { textObjectId: string; error: Error | string } }
  | { type: 'clearSaveError'; payload: { textObjectId: string } };

export const reducer: Reducer<Store, Action> = (state, action) =>
  produce<Store>(state, draft => {
    if (action.type === 'setSaving') {
      draft.saving = action.payload;
      return;
    }

    if (action.type === 'setCurrent') {
      draft.currentTextObjectId = action.payload;
      return;
    }

    if (action.type === 'upsertAndSetCurrent') {
      draft.currentTextObjectId = action.payload.id;
      draft.textObjects[action.payload.id] = action.payload;
      return;
    }

    if (action.type === 'upsert' || action.type === 'upsertMany') {
      const objectsArray = Array.isArray(action.payload) ? action.payload : [action.payload];
      for (const object of objectsArray) {
        const previousObject = draft.textObjects[object.id];
        // Do we aready have this object?
        if (previousObject) {
          draft.textObjects[object.id] = { ...previousObject, ...object };
        } else {
          try {
            draft.textObjects[object.id] = throwIfUnknown(exactTextObjectSchema, object);
            if (draft.textObjectsSaveError[object.id]) {
              delete draft.textObjectsSaveError[object.id];
            }
          } catch (e) {
            draft.textObjectsSaveError[object.id] = e;
          }
        }
      }
      return;
    }

    if (action.type === 'delete') {
      if (state.currentTextObjectId === action.payload) {
        const scratchPad = Object.values(state.textObjects).find(
          textObject => textObject.isScratchPad
        )!;
        draft.currentTextObjectId = scratchPad.id;
      }
      delete draft.textObjects[action.payload];
    }

    if (action.type === 'saveError') {
      const { error, textObjectId } = action.payload;
      draft.textObjectsSaveError[textObjectId] = typeof error === 'string' ? error : error.message;
      return;
    }

    if (action.type === 'clearSaveError') {
      const { textObjectId } = action.payload;
      delete draft.textObjectsSaveError[textObjectId];
      return;
    }

    return draft;
  });
