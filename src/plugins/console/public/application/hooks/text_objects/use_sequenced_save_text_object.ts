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

import { useRef, useCallback } from 'react';
import { throttle } from 'lodash';
import { useServicesContext } from '../../contexts';
import { TextObjectWithId } from '../../../../common/text_object';

import { useTextObjectsCRUD } from './use_text_objects_crud';

const WAIT_MS = 500;

/**
 * For a given saved object, we want to make sure that edits are saved in
 * the sequence which they arrive, not the rate at which they are stored.
 */
export const useSequencedSaveTextObjectText = (textObject: TextObjectWithId) => {
  const promiseChainRef = useRef(Promise.resolve());

  const {
    services: { objectStorageClient },
  } = useServicesContext();

  const crud = useTextObjectsCRUD();

  return useCallback(
    throttle(
      (text: string) => {
        const { current: promise } = promiseChainRef;
        // Update remote
        promise.finally(() => {
          return crud.update({ textObject: { id: textObject.id, text, updatedAt: Date.now() } });
        });
      },
      WAIT_MS,
      { trailing: true }
    ),
    [objectStorageClient]
  );
};
