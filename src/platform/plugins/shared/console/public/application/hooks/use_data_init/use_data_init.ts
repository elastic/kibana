/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { TextObject } from '../../../../common/text_object';
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
    services: { objectStorageClient, history, savedSnippetsService },
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
          // For backwards compatibility, we sort here according to date created to
          // always take the first item created.
          const lastObject = results.sort((a, b) => a.createdAt - b.createdAt)[0];
          if (lastObject.text === '') {
            // If the last stored text is empty, add a new object with undefined text so that the default input is displayed at initial render
            const textObject = {
              ...lastObject,
              text: undefined,
              updatedAt: Date.now(),
            } as TextObject;

            objectStorageClient.text.update(textObject);
            dispatch({ type: 'setCurrentTextObject', payload: textObject });
          } else {
            dispatch({
              type: 'setCurrentTextObject',
              payload: lastObject,
            });
          }
        }

        // Handle URL deep linking for loading snippets
        const urlParams = new URLSearchParams(window.location.search);
        const snippetId = urlParams.get('loadSnippet');

        if (snippetId && savedSnippetsService) {
          try {
            const snippet = await savedSnippetsService.get(snippetId);
            if (snippet) {
              // Get the current text object that was just set
              const currentTextObject = results.length
                ? results.sort((a, b) => a.createdAt - b.createdAt)[0]
                : await objectStorageClient.text.findAll().then((objs) => objs[0]);

              // Update it with the snippet content
              const textObjectWithSnippet = {
                ...currentTextObject,
                text: snippet.query,
                updatedAt: Date.now(),
              } as TextObject;

              objectStorageClient.text.update(textObjectWithSnippet);
              dispatch({
                type: 'setCurrentTextObject',
                payload: textObjectWithSnippet,
              });

              // Clear the URL parameter to avoid reloading on refresh
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('loadSnippet');
              window.history.replaceState({}, '', newUrl.toString());
            }
          } catch (snippetError) {
            // If snippet loading fails, just continue with normal initialization
            // The error is not critical to the app functioning
            console.error('Failed to load snippet from URL:', snippetError);
          }
        }
      } catch (e) {
        setError(e);
      } finally {
        setDone(true);
      }
    };

    load();
  }, [dispatch, objectStorageClient, history, retryToken, savedSnippetsService]);

  return {
    error,
    done,
    retry,
  };
};
