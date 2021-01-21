/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useRef, useCallback } from 'react';
import { throttle } from 'lodash';
import { useEditorReadContext, useServicesContext } from '../contexts';

const WAIT_MS = 500;

export const useSaveCurrentTextObject = () => {
  const promiseChainRef = useRef(Promise.resolve());

  const {
    services: { objectStorageClient },
  } = useServicesContext();

  const { currentTextObject } = useEditorReadContext();

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  return useCallback(
    throttle(
      (text: string) => {
        const { current: promise } = promiseChainRef;
        if (!currentTextObject) return;
        promise.finally(() =>
          objectStorageClient.text.update({ ...currentTextObject, text, updatedAt: Date.now() })
        );
      },
      WAIT_MS,
      { trailing: true }
    ),
    [objectStorageClient, currentTextObject]
  );
};
