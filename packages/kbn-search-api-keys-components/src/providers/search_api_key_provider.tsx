/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useReducer, createContext, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { APIKeyCreationResponse } from '@kbn/search-api-keys-server/types';
import { APIRoutes } from '../types';
import { Status } from '../constants';

const API_KEY_STORAGE_KEY = 'searchApiKey';
const API_KEY_MASK = '•'.repeat(60);

interface ApiKeyState {
  status: Status;
  apiKey: string | null;
}

interface APIKeyContext {
  displayedApiKey: string | null;
  apiKey: string | null;
  toggleApiKeyVisibility: () => void;
  updateApiKey: ({ id, encoded }: { id: string; encoded: string }) => void;
  status: Status;
  apiKeyIsVisible: boolean;
  initialiseKey: () => void;
}

type Action =
  | { type: 'SET_API_KEY'; apiKey: string; status: Status }
  | { type: 'SET_STATUS'; status: Status }
  | { type: 'CLEAR_API_KEY' }
  | { type: 'TOGGLE_API_KEY_VISIBILITY' };

const initialState: ApiKeyState = {
  apiKey: null,
  status: Status.uninitialized,
};

const reducer = (state: ApiKeyState, action: Action): ApiKeyState => {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.apiKey, status: action.status };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'TOGGLE_API_KEY_VISIBILITY':
      return {
        ...state,
        status:
          state.status === Status.showHiddenKey ? Status.showPreviewKey : Status.showHiddenKey,
      };
    case 'CLEAR_API_KEY':
      return { ...state, apiKey: null, status: Status.showCreateButton };
    default:
      return state;
  }
};

export const ApiKeyContext = createContext<APIKeyContext>({
  displayedApiKey: null,
  apiKey: null,
  toggleApiKeyVisibility: () => {},
  updateApiKey: () => {},
  status: Status.uninitialized,
  apiKeyIsVisible: false,
  initialiseKey: () => {},
});

export const SearchApiKeyProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { http } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const updateApiKey = useCallback(({ id, encoded }: { id: string; encoded: string }) => {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({ id, encoded }));
    dispatch({ type: 'SET_API_KEY', apiKey: encoded, status: Status.showHiddenKey });
  }, []);
  const handleShowKeyVisibility = useCallback(() => {
    dispatch({ type: 'TOGGLE_API_KEY_VISIBILITY' });
  }, []);
  const initialiseKey = useCallback(() => {
    dispatch({ type: 'SET_STATUS', status: Status.loading });
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
    const initialiseApiKey = async () => {
      try {
        if (state.status === Status.loading) {
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
        }
      } catch (e) {
        dispatch({ type: 'CLEAR_API_KEY' });
      }
    };

    initialiseApiKey();
  }, [state.status, createApiKey, validateApiKey]);

  const value: APIKeyContext = {
    displayedApiKey: state.status === Status.showPreviewKey ? state.apiKey : API_KEY_MASK,
    apiKey: state.apiKey,
    toggleApiKeyVisibility: handleShowKeyVisibility,
    updateApiKey,
    status: state.status,
    apiKeyIsVisible: state.status === Status.showPreviewKey,
    initialiseKey,
  };

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
};
