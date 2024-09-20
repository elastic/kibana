/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { migrateToTextObjects } from './data_migration';
import { useEditorActionContext, useServicesContext } from '../../contexts';

export const useDataInit = () => {
  const [error, setError] = useState<Error | null>(null);
  const [done, setDone] = useState<boolean>(false);
  const [retryToken, setRetryToken] = useState<object>({});

  const retry = useCallback(() => {
    setRetryToken({});
    setDone(false);
    setError(null);
  }, []);

  const {
    services: { objectStorageClient, history },
  } = useServicesContext();

  const dispatch = useEditorActionContext();

  useEffect(() => {
    const load = async () => {
      try {
        await migrateToTextObjects({ history, objectStorageClient });
        const results = await objectStorageClient.text.findAll();
        if (!results.length) {
          const newObject = await objectStorageClient.text.create({
            createdAt: Date.now(),
            updatedAt: Date.now(),
            text: undefined,
          });
          dispatch({ type: 'setCurrentTextObject', payload: newObject });
        } else {
          dispatch({
            type: 'setCurrentTextObject',
            // For backwards compatibility, we sort here according to date created to
            // always take the first item created.
            payload: results.sort((a, b) => a.createdAt - b.createdAt)[0],
          });
        }
      } catch (e) {
        setError(e);
      } finally {
        setDone(true);
      }
    };

    load();
  }, [dispatch, objectStorageClient, history, retryToken]);

  return {
    error,
    done,
    retry,
  };
};
