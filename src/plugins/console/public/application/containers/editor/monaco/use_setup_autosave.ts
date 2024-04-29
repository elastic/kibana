/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef } from 'react';
import { useSaveCurrentTextObject } from '../../../hooks';

interface SetupAutosaveParams {
  /** The current input value in the Console editor. */
  value: string;
}

/**
 * Hook that sets up autosaving the Console editor input to localStorage.
 *
 * @param params The {@link SetupAutosaveParams} to use.
 */
export const useSetupAutosave = (params: SetupAutosaveParams) => {
  const { value } = params;
  const saveCurrentTextObject = useSaveCurrentTextObject();
  const timerRef = useRef<number | undefined>();

  useEffect(() => {
    function saveCurrentState() {
      try {
        saveCurrentTextObject(value);
      } catch (e) {
        // Ignoring saving error
      }
    }

    const saveDelay = 500;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(saveCurrentState, saveDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [saveCurrentTextObject, value]);
};
