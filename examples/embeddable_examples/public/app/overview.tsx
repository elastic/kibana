/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';

export const Overview = () => {
  return (
    <EuiText>
      <p>
        Embeddables are React components that manage their own state, can be serialized and
        deserialized, and return an API that can be used to interact with them imperatively.
      </p>
    </EuiText>
  );
};
