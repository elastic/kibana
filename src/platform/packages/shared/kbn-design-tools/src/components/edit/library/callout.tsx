/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

export const CalloutInfo = () => (
  <EuiCallOut title="Information" iconType="iInCircle">
    <p>Here is some important information for you.</p>
  </EuiCallOut>
);

export const CalloutSuccess = () => (
  <EuiCallOut title="Success!" color="success" iconType="check">
    <p>The operation completed successfully.</p>
  </EuiCallOut>
);

export const CalloutWarning = () => (
  <EuiCallOut title="Proceed with caution" color="warning" iconType="warning">
    <p>This action may have unintended consequences.</p>
  </EuiCallOut>
);

export const CalloutDanger = () => (
  <EuiCallOut title="Error" color="danger" iconType="error">
    <p>Something went wrong. Please try again.</p>
  </EuiCallOut>
);

export const CalloutSmall = () => <EuiCallOut title="Small callout for inline messages" size="s" />;

export const CalloutTitleOnly = () => <EuiCallOut title="Callouts can exist as just a title" />;
