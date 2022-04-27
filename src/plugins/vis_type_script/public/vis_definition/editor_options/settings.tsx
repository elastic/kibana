/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
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

import type { IExternalUrl } from '@kbn/core/public';
import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import type { VisParams } from '../../types';

const DependencyUrl = ({
  url,
  allowed,
  update,
  remove,
}: {
  url: string;
  allowed: (url: string) => boolean;
  update: (newVal: string) => void;
  remove: () => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const showErrors = !allowed(url) && !isFocused;
  // TODO add URL format validation
  const errors = showErrors
    ? ['Your Kibana administrator does not allow this URL. This dependency will be ignored.']
    : [];

  return (
    <EuiFormRow isInvalid={showErrors} error={errors} fullWidth>
      <EuiFieldText
        onBlur={() => setIsFocused(false)}
        onFocus={() => setIsFocused(true)}
        fullWidth
        value={url}
        onChange={(event) => update(event.target.value)}
        isInvalid={showErrors}
        append={
          <EuiButtonIcon iconType="crossInACircleFilled" color="text" onClick={() => remove()} />
        }
      />
    </EuiFormRow>
  );
};

function SettingsOptions({
  stateParams: { dependencyUrls },
  setValue,
  validateUrl,
}: VisEditorOptionsProps<VisParams> & { validateUrl: IExternalUrl['validateUrl'] }) {
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

  const allowed = (url: string) => {
    try {
      return validateUrl(url) !== null;
    } catch {
      return true;
    }
  };

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>Dependencies</h2>
      </EuiTitle>
      <EuiForm component="form">
        {dependencyUrls.map((url: string, index: number) => (
          <DependencyUrl
            url={url}
            allowed={allowed}
            update={(val) => updateNthDependency(index, val)}
            remove={() => removeNthDependency(index)}
          />
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
