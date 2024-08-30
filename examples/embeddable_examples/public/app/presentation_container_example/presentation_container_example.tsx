/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

export const PresentationContainerExample = () => {
  return (
    <div>
      <EuiCallOut
        title="PresentationContainer interface"
      >
        <p>
          Implement the <strong>PresentationContainer</strong> interface to allow users to add and remove embeddables in an applicaiton.
        </p>
        <p>
          Each embeddable manages its own state.
          The page is only responsible for persisting and providing the last persisted state to the embeddable on startup.
          This example uses session storage to persist saved state and unsaved changes.
        </p>
      </EuiCallOut>
    </div>
  );
}