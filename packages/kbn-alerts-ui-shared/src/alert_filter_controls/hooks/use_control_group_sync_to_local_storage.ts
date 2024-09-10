/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface UseControlGroupSyncToLocalStorageArgs {
  Storage: typeof Storage;
  storageKey: string;
  shouldSync: boolean;
}

type UseControlGroupSyncToLocalStorage = (args: UseControlGroupSyncToLocalStorageArgs) => {
  controlGroupInput: ControlGroupInput | undefined;
  setControlGroupInput: Dispatch<SetStateAction<ControlGroupInput>>;
  getStoredControlGroupInput: () => ControlGroupInput | undefined;
};

export const useControlGroupSyncToLocalStorage: UseControlGroupSyncToLocalStorage = ({
  Storage,
  storageKey,
  shouldSync,
}) => {
  const storage = useRef(new Storage(localStorage));

  const [controlGroupInput, setControlGroupInput] = useState(
    () => (storage.current.get(storageKey) as ControlGroupInput) ?? undefined
  );

  useEffect(() => {
    if (shouldSync && controlGroupInput) {
      storage.current.set(storageKey, controlGroupInput);
    }
  }, [shouldSync, controlGroupInput, storageKey]);

  const getStoredControlGroupInput = () => {
    return (storage.current.get(storageKey) as ControlGroupInput) ?? undefined;
  };

  return {
    controlGroupInput,
    setControlGroupInput,
    getStoredControlGroupInput,
  };
};
