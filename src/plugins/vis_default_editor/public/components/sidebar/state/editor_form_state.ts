/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useState, useCallback } from 'react';

export type SetValidity = (modelName: string, value: boolean) => void;
export type SetTouched = (value: boolean) => void;

const initialFormState = {
  validity: {},
  touched: false,
  invalid: false,
};

function useEditorFormState() {
  const [formState, setFormState] = useState(initialFormState);

  const setValidity: SetValidity = useCallback((modelName, value) => {
    setFormState((model) => {
      const validity = {
        ...model.validity,
        [modelName]: value,
      };

      return {
        ...model,
        validity,
        invalid: Object.values(validity).some((valid) => !valid),
      };
    });
  }, []);

  const resetValidity = useCallback(() => {
    setFormState(initialFormState);
  }, []);

  const setTouched = useCallback((touched: boolean) => {
    setFormState((model) => ({
      ...model,
      touched,
    }));
  }, []);

  return {
    formState,
    setValidity,
    setTouched,
    resetValidity,
  };
}

export { useEditorFormState };
