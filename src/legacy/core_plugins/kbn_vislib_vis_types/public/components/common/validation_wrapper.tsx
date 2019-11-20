/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { VisOptionsProps } from 'ui/vis/editors/default';

export interface ValidationVisOptionsProps<T> extends VisOptionsProps<T> {
  setMultipleValidity(paramName: string, isValid: boolean): void;
}

interface ValidationWrapperProps<T> extends VisOptionsProps<T> {
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
  const isPanelValid = Object.values(panelState).every(item => item.isValid);
  const { setValidity } = rest;

  const setValidityHandler = useCallback((paramName: string, isValid: boolean) => {
    setPanelState(state => ({
      ...state,
      [paramName]: {
        isValid,
      },
    }));
  }, []);

  useEffect(() => {
    setValidity(isPanelValid);
  }, [isPanelValid]);

  return <Component {...rest} setMultipleValidity={setValidityHandler} />;
}

export { ValidationWrapper };
