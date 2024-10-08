/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useToggle from 'react-use/lib/useToggle';

export type VoidHandler = () => void;

export interface UseBooleanHandlers {
  on: VoidHandler;
  off: VoidHandler;
  toggle: ReturnType<typeof useToggle>[1];
}

export type UseBooleanResult = [boolean, UseBooleanHandlers];

export const useBoolean = (initialValue: boolean = false): UseBooleanResult => {
  const [value, toggle] = useToggle(initialValue);

  const handlers = useMemo(
    () => ({
      toggle,
      on: () => toggle(true),
      off: () => toggle(false),
    }),
    [toggle]
  );

  return [value, handlers];
};
