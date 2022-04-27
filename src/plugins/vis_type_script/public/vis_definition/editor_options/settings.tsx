/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import type { VisEditorOptionsProps } from '../../../../visualizations/public';
import type { VisParams } from '../../types';

function SettingsOptions({
  stateParams: { dependencyUrls },
  setValue,
}: VisEditorOptionsProps<VisParams>) {
  const setDependencyUrls = (newDependencyUrls: string[]) =>
    setValue('dependencyUrls', newDependencyUrls);

  const updateNthDependency = (n: number, newValue: string) => {
    const newDependencies = [...dependencyUrls];
    newDependencies[n] = newValue;
    setDependencyUrls(newDependencies);
  };

  const removeNthDependency = (n: number) => {
    setDependencyUrls(dependencyUrls.filter((_, index) => index !== n));
  };

  const addDependency = () => {
    setDependencyUrls([...dependencyUrls, '']);
  };

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>Dependencies</h2>
      </EuiTitle>
      <EuiForm component="form">
        {dependencyUrls.map((url: string, index: number) => (
          <EuiFormRow key={index} fullWidth>
            <EuiFieldText
              fullWidth
              value={url}
              onChange={(event) => updateNthDependency(index, event.target.value)}
              append={
                <EuiButtonIcon
                  iconType="crossInACircleFilled"
                  color="text"
                  onClick={() => removeNthDependency(index)}
                />
              }
            />
          </EuiFormRow>
        ))}
      </EuiForm>
      <EuiSpacer size="m" />
      <EuiButton size="s" fullWidth iconType="listAdd" onClick={addDependency}>
        Add dependency
      </EuiButton>
    </EuiPanel>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { SettingsOptions as default };
