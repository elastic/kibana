/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, useCallback } from 'react';

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';

export interface ValidationVisOptionsProps<T> extends VisEditorOptionsProps<T> {
  setMultipleValidity(paramName: string, isValid: boolean): void;
}

interface ValidationWrapperProps<T> extends VisEditorOptionsProps<T> {
  component: React.ComponentType<ValidationVisOptionsProps<T>>;
}

interface Item {
  isValid: boolean;
}

function ValidationWrapper<T = unknown>({
  component: Component,
  ...rest
}: ValidationWrapperProps<T>) {
  const [panelState, setPanelState] = useState({} as { [key: string]: Item });
  const isPanelValid = Object.values(panelState).every((item) => item.isValid);
  const { setValidity } = rest;

  const setValidityHandler = useCallback((paramName: string, isValid: boolean) => {
    setPanelState((state) => ({
      ...state,
      [paramName]: {
        isValid,
      },
    }));
  }, []);

  useEffect(() => {
    setValidity(isPanelValid);
  }, [isPanelValid, setValidity]);

  return <Component {...rest} setMultipleValidity={setValidityHandler} />;
}

export { ValidationWrapper };
