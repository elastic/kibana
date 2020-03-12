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

import { useCallback } from 'react';
import * as t from 'io-ts';
import { useServicesContext, useTextObjectsActionContext } from '../../contexts';
import {
  TextObject,
  requiredTextObjectProps,
  optionalTextObjectProps,
  throwIfUnknown,
  textObjectSchema,
  TextObjectWithId,
} from '../../../../common/text_object';
import { idObjectProps } from '../../../../common/id_object';

const exactTextObjectSchema = t.exact(textObjectSchema);
const partialTextObjectSchema = t.exact(
  t.intersection([
    t.partial({ ...requiredTextObjectProps, ...optionalTextObjectProps }),
    t.type(idObjectProps),
  ])
);

const PREVENT_UI_FLASHES_DELAY = 100;

export interface CreateTextObjectsArgs {
  textObject: TextObject;

  /**
   * A flag indicating whether we want to set this as the active
   * text object after creating it.
   *
   * @default true
   */
  createAndSelect?: boolean;
}

export interface UpdateTextObjectArgs {
  textObject: t.TypeOf<typeof partialTextObjectSchema>;
}

/**
 * A hook for functionality to create, retrieve, update and delete text objects.
 *
 * This is where we sync local stores after updating remote persistence with an
 * operation provided by this hook.
 */
export const useTextObjectsCRUD = () => {
  const dispatch = useTextObjectsActionContext();
  const {
    services: { objectStorageClient },
  } = useServicesContext();

  return {
    create: useCallback(
      async ({ textObject, createAndSelect = true }: CreateTextObjectsArgs) => {
        const result = await objectStorageClient.text.create(
          throwIfUnknown(exactTextObjectSchema, textObject)
        );

        if (createAndSelect) {
          dispatch({
            type: 'upsertAndSetCurrent',
            payload: result,
          });
        } else {
          dispatch({
            type: 'upsert',
            payload: result,
          });
        }
      },
      [objectStorageClient, dispatch]
    ),

    update: useCallback(
      async ({ textObject }: UpdateTextObjectArgs) => {
        let timeoutHandle: any;
        try {
          // Update local reference
          const { text, ...localValues } = textObject;
          dispatch({ type: 'upsert', payload: localValues });

          // Update persistence

          timeoutHandle = setTimeout(() => {
            // Prevent UI flashes.
            dispatch({ type: 'setSavingTextObject', payload: textObject.id });
          }, PREVENT_UI_FLASHES_DELAY);
          await objectStorageClient.text.update(
            throwIfUnknown(partialTextObjectSchema, textObject)
          );
          dispatch({ type: 'clearSaveError', payload: { textObjectId: textObject.id } });
        } catch (e) {
          dispatch({ type: 'saveError', payload: { textObjectId: textObject.id, error: e } });
        } finally {
          // Cleanup state and resources
          clearTimeout(timeoutHandle);
          dispatch({ type: 'setSavingTextObject', payload: undefined });
        }
      },
      [objectStorageClient, dispatch]
    ),

    delete: useCallback(
      async ({ isScratchPad, id }: TextObjectWithId) => {
        if (isScratchPad) {
          throw new Error('Can not delete scratch pad!');
        }
        await objectStorageClient.text.delete(id);
        dispatch({
          payload: id,
          type: 'delete',
        });
      },
      [objectStorageClient, dispatch]
    ),
  };
};
