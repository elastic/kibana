/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

export const PageTitle = ({ title }: Record<string, any>) => {
  return (
    <EuiText>
      <h1 data-test-subj="managementSettingsTitle">{title}</h1>
    </EuiText>
  );
};
