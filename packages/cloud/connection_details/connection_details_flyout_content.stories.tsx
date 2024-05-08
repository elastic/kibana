/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import {
  StoriesProvider,
  StoriesProviderKeyCreationError,
  StoriesProviderNoKeyPermissions,
} from './stories';
import { ConnectionDetailsFlyoutContent } from './connection_details_flyout_content';

export default {
  title: 'Connection Details/Flyout',
};

export const Default = () => {
  return (
    <EuiFlyout size="l" onClose={() => {}}>
      <StoriesProvider>
        <ConnectionDetailsFlyoutContent />
      </StoriesProvider>
    </EuiFlyout>
  );
};

export const CreationError = () => {
  return (
    <EuiFlyout size="l" onClose={() => {}}>
      <StoriesProviderKeyCreationError>
        <ConnectionDetailsFlyoutContent />
      </StoriesProviderKeyCreationError>
    </EuiFlyout>
  );
};

export const MissingPermissions = () => {
  return (
    <EuiFlyout size="l" onClose={() => {}}>
      <StoriesProviderNoKeyPermissions>
        <ConnectionDetailsFlyoutContent />
      </StoriesProviderNoKeyPermissions>
    </EuiFlyout>
  );
};
