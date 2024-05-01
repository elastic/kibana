/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import * as React from 'react';
import { ValidPermissionsResult } from '../../../kibana/kibana_connection_details_provider';

export interface APIKeysProps {
  getAPIKeys: Promise<ValidPermissionsResult | undefined>;
}

export const APIKeysRender: React.FC<APIKeysProps> = ({ getAPIKeys }) => {
  console.log(getAPIKeys);
  const body = (
    <EuiFormRow>
      <EuiFieldText>{'placeholder'}</EuiFieldText>
    </EuiFormRow>
  );
  return <EuiForm>{body}</EuiForm>;
};
