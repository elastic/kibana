/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useState, useCallback } from 'react';

import { VisOptionsProps } from '../../../../../vis_default_editor/public';

export interface ValidationVisOptionsProps<T, E = unknown> extends VisOptionsProps<T> {
  setMultipleValidity(paramName: string, isValid: boolean): void;
  extraProps?: E;
}

interface ValidationWrapperProps<T, E> extends VisOptionsProps<T> {
  component: React.ComponentType<ValidationVisOptionsProps<T, E>>;
  extraProps?: E;
}

interface Item {
  isValid: boolean;
}

function ValidationWrapper<T = unknown, E = unknown>({
  component: Component,
  ...rest
}: ValidationWrapperProps<T, E>) {
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
