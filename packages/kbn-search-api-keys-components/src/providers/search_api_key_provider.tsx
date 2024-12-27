/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, createContext, useState, useMemo, useRef } from 'react';
import { useCreateApiKey } from '../hooks/use_create_api_key';
import { Status } from '../constants';
import { useValidateApiKey } from '../hooks/use_validate_api_key';

const API_KEY_STORAGE_KEY = 'searchApiKey';

interface APIKeyContext {
  apiKey: string | null;
  toggleApiKeyVisibility: () => void;
  updateApiKey: ({ id, encoded }: { id: string; encoded: string }) => void;
  status: Status;
  initialiseKey: () => void;
}

export const ApiKeyContext = createContext<APIKeyContext>({
  apiKey: null,
  toggleApiKeyVisibility: () => {},
  updateApiKey: () => {},
  status: Status.uninitialized,
  initialiseKey: () => {},
});

export const SearchApiKeyProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const isInitialising = useRef(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(Status.uninitialized);
  const updateApiKey = useCallback(({ id, encoded }: { id: string; encoded: string }) => {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify({ id, encoded }));
    setApiKey(encoded);
    setStatus(Status.showHiddenKey);
  }, []);
  const toggleApiKeyVisibility = useCallback(() => {
    setStatus((prevStatus) =>
      prevStatus === Status.showHiddenKey ? Status.showPreviewKey : Status.showHiddenKey
    );
  }, []);
  const validateApiKey = useValidateApiKey();
  const createApiKey = useCreateApiKey({
    onSuccess: (receivedApiKey) => {
      if (receivedApiKey) {
        sessionStorage.setItem(
          API_KEY_STORAGE_KEY,
          JSON.stringify({ id: receivedApiKey.id, encoded: receivedApiKey.encoded })
        );
        setApiKey(receivedApiKey.encoded);
        setStatus(Status.showHiddenKey);
      }
    },
    onError: (err) => {
      if (err.response?.status === 400) {
        setStatus(Status.showCreateButton);
      } else if (err.response?.status === 403) {
        setStatus(Status.showUserPrivilegesError);
      } else {
        throw err;
      }
    },
  });
  const initialiseKey = useCallback(async () => {
    if (status !== Status.uninitialized || isInitialising.current) {
      return;
    }

    isInitialising.current = true;

    try {
      setStatus(Status.loading);
      const storedKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);

      if (storedKey) {
        const { id, encoded } = JSON.parse(storedKey);

        if (await validateApiKey(id)) {
          setApiKey(encoded);
          setStatus(Status.showHiddenKey);
        } else {
          sessionStorage.removeItem(API_KEY_STORAGE_KEY);
          setApiKey(null);
          setStatus(Status.showCreateButton);
          await createApiKey();
        }
      } else {
        await createApiKey();
      }
    } catch (e) {
      setApiKey(null);
      setStatus(Status.showCreateButton);
    } finally {
      isInitialising.current = false;
    }
  }, [status, createApiKey, validateApiKey]);

  const value: APIKeyContext = useMemo(
    () => ({
      apiKey,
      toggleApiKeyVisibility,
      updateApiKey,
      status,
      initialiseKey,
    }),
    [apiKey, status, toggleApiKeyVisibility, updateApiKey, initialiseKey]
  );

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
};
