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
