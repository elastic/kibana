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

import { useEffect, useState } from 'react';
import { migrateToTextObjects } from './data_migration';
import { useEditorActionContext, useServicesContext } from '../../contexts';

export const useDataInit = () => {
  const [error, setError] = useState<Error | null>(null);
  const [done, setDone] = useState<boolean>(false);

  const {
    services: { objectStorageClient, history },
  } = useServicesContext();

  const dispatch = useEditorActionContext();

  useEffect(() => {
    const load = async () => {
      try {
        await migrateToTextObjects({ history, objectStorageClient });
        const results = await objectStorageClient.text.findAll();
        if (!results) {
          const newObject = await objectStorageClient.text.create({
            createdAt: Date.now(),
            updatedAt: Date.now(),
            text: '',
          });
          dispatch({ type: 'setCurrentTextObject', payload: newObject });
        } else {
          dispatch({ type: 'setCurrentTextObject', payload: results[0] });
        }
      } catch (e) {
        setError(e);
      } finally {
        setDone(true);
      }
    };

    load();
  }, [dispatch, objectStorageClient, history]);

  return {
    error,
    done,
  };
};
