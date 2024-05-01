/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiForm, EuiText } from '@elastic/eui';
import type { ValidPermissionsResult } from '@kbn/security-plugin-types-server';
import * as React from 'react';

export interface APIKeysProps {
  getAPIKeys: () => Promise<ValidPermissionsResult | undefined>;
}

export const APIKeysRender: React.FC<APIKeysProps> = ({ getAPIKeys }) => {
  const name = getAPIKeys().then((keys) => {
    if (keys) {
      return console.log(keys?.apiKeys.map((key) => key.name));
    }
  });
  return (
    <EuiForm>
      {Array.from(name).forEach((keyName) => (
        <EuiText>{keyName}</EuiText>
      ))}
    </EuiForm>
  );
};
