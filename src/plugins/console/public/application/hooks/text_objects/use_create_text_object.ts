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
import { useServicesContext, useEditorActionContext } from '../../contexts';
import { TextObject } from '../../../../common/text_object';

interface AddTextObjectArgs {
  textObject: Omit<TextObject, 'id'>;

  /**
   * A flag indicating whether we want to set this as the active
   * text object after creating it.
   *
   * @default true
   */
  createAndSelect?: boolean;
}

export const useCreateTextObject = () => {
  const dispatch = useEditorActionContext();
  const {
    services: { objectStorageClient },
  } = useServicesContext();

  return useCallback(
    async ({ textObject, createAndSelect = true }: AddTextObjectArgs) => {
      const result = await objectStorageClient.text.create(textObject);

      if (createAndSelect) {
        dispatch({
          type: 'textObject.upsertAndSetCurrent',
          payload: result,
        });
      } else {
        dispatch({
          type: 'textObject.upsert',
          payload: result,
        });
      }
    },
    [objectStorageClient, dispatch]
  );
};
