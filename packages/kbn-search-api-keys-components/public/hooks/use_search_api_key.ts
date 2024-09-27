/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useCallback, useReducer } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { APIKeyCreationResponse } from '@kbn/search-api-keys-api/types';
import { APIRoutes } from '../../types';

const API_KEY_STORAGE_KEY = 'searchApiKey';
const API_KEY_MASK = '•'.repeat(60);

export enum Status {
  loading = 'loading',
  showCreateButton = 'showCreateButton',
  showHiddenKey = 'showHiddenKey',
  showPreviewKey = 'showPreviewKey',
  showUserPrivilegesError = 'showUserPrivilegesError',
}

interface ApiKeyState {
  status: Status;
  apiKey: string | null;
}

type Action =
  | { type: 'SET_API_KEY'; apiKey: string; status: Status }
  | { type: 'SET_STATUS'; status: Status }
  | { type: 'CLEAR_API_KEY' };

const initialState: ApiKeyState = {
  apiKey: null,
  status: Status.loading,
};

const reducer = (state: ApiKeyState, action: Action): ApiKeyState => {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.apiKey, status: action.status };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'CLEAR_API_KEY':
      return { ...state, apiKey: null, status: Status.showCreateButton };
    default:
      return state;
  }
};

export const useSearchApiKey = () => {
  const { http } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);
  const handleSaveKey = useCallback(({ id, encoded }: { id: string; encoded: string }) => {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({ id, encoded }));
    dispatch({ type: 'SET_API_KEY', apiKey: encoded, status: Status.showHiddenKey });
  }, []);
  const handleShowKeyVisibility = useCallback(() => {
    dispatch({ type: 'SET_STATUS', status: Status.showPreviewKey });
  }, []);
  const { mutateAsync: validateApiKey } = useMutation(async (id: string) => {
    try {
      if (!http?.post) {
        throw new Error('HTTP service is unavailable');
      }

      const response = await http.post<{ isValid: boolean }>(APIRoutes.API_KEY_VALIDITY, {
        body: JSON.stringify({ id }),
      });

      return response.isValid;
    } catch (err) {
      return false;
    }
  });
  const { mutateAsync: createApiKey } = useMutation<APIKeyCreationResponse | undefined>({
    mutationFn: async () => {
      try {
        if (!http?.post) {
          throw new Error('HTTP service is unavailable');
        }

        return await http.post<APIKeyCreationResponse>(APIRoutes.API_KEYS);
      } catch (err) {
        if (err.response?.status === 400) {
          dispatch({ type: 'SET_STATUS', status: Status.showCreateButton });
        } else if (err.response?.status === 403) {
          dispatch({ type: 'SET_STATUS', status: Status.showUserPrivilegesError });
        } else {
          throw err;
        }
      }
    },
    onSuccess: (receivedApiKey) => {
      if (receivedApiKey) {
        sessionStorage.setItem(
          API_KEY_STORAGE_KEY,
          JSON.stringify({ id: receivedApiKey.id, encoded: receivedApiKey.encoded })
        );
        dispatch({
          type: 'SET_API_KEY',
          apiKey: receivedApiKey.encoded,
          status: Status.showHiddenKey,
        });
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const storedKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);

        if (storedKey) {
          const { id, encoded } = JSON.parse(storedKey);

          if (await validateApiKey(id)) {
            dispatch({
              type: 'SET_API_KEY',
              apiKey: encoded,
              status: Status.showHiddenKey,
            });
          } else {
            sessionStorage.removeItem(API_KEY_STORAGE_KEY);
            dispatch({
              type: 'CLEAR_API_KEY',
            });
            await createApiKey();
          }
        } else {
          await createApiKey();
        }
      } catch (e) {
        throw e;
      }
    })();
  }, [validateApiKey, createApiKey]);

  return {
    displayedApiKey: state.status === Status.showHiddenKey ? API_KEY_MASK : state.apiKey,
    apiKey: state.apiKey,
    showAPIKey: handleShowKeyVisibility,
    handleSaveKey,
    status: state.status,
  };
};
