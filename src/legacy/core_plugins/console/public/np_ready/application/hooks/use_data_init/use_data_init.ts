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
import {
  localStorageToSavedObjects,
  shouldMigrate,
} from './migrate_from_local_storage_to_saved_objects';
import { useEditorActionContext, useServicesContext } from '../../contexts';

export const useDataInit = () => {
  const [error, setError] = useState('');
  const [done, setDone] = useState<boolean>(false);

  const {
    services: { db, history },
  } = useServicesContext();

  const dispatch = useEditorActionContext();

  useEffect(() => {
    const load = async () => {
      try {
        if (shouldMigrate(history)) {
          await localStorageToSavedObjects({ history, database: db });
        }
        const results = await db.text.findAll();
        if (!results) {
          const newObject = await db.text.create({
            userId: 'n',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            text: '',
          });
          dispatch({ type: 'setCurrentTextObject', payload: newObject });
        } else {
          const existingObject = results[Object.keys(results)[0]];
          dispatch({ type: 'setCurrentTextObject', payload: existingObject });
        }
      } catch (e) {
        setError(e);
      } finally {
        setDone(true);
      }
    };

    load();
  }, [dispatch, db, history]);

  return {
    error,
    done,
  };
};
