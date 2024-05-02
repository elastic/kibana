/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiFlexGroup, EuiText } from '@elastic/eui';
import React from 'react';
import { useBoolean } from './use_boolean';

export default {
  title: 'Hooks/useBoolean',
  component: Demo,
};

export function Demo() {
  const [value, { on, off, toggle }] = useBoolean();

  return (
    <div>
      <EuiText>
        The current value is <strong>{value.toString().toUpperCase()}</strong>
      </EuiText>
      <EuiFlexGroup>
        <EuiButton onClick={on}>On</EuiButton>
        <EuiButton onClick={off}>Off</EuiButton>
        <EuiButton onClick={toggle}>Toggle</EuiButton>
      </EuiFlexGroup>
    </div>
  );
}
