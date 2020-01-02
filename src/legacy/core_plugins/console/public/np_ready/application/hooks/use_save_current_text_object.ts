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
import { useEditorReadContext, useServicesContext } from '../contexts';

const WAIT_MS = 1000;

export const useSaveCurrentTextObject = () => {
  const promiseChainRef = useRef(Promise.resolve());

  const {
    services: { db },
  } = useServicesContext();

  const { currentTextObject } = useEditorReadContext();

  return useCallback(
    throttle(
      (text: string) => {
        const { current: promise } = promiseChainRef;
        if (!currentTextObject) return;
        promise.finally(() => db.text.update({ ...currentTextObject, text }));
      },
      WAIT_MS,
      { trailing: true }
    ),
    [db, currentTextObject]
  );
};
