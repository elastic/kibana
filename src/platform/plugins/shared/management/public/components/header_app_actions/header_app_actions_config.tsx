/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

/**
 * Header app actions config for the Management app.
 * Renders a single "New" secondary action (noop); section-specific create actions
 * (e.g. Create space, Create user) can be wired here later.
 */
export const getManagementHeaderAppActionsConfig = (): ChromeHeaderAppActionsConfig => ({
  secondaryActions: [
    <EuiButtonIcon
      key="new"
      size="xs"
      color="text"
      iconType="plusInCircle"
      onClick={noop}
      aria-label={i18n.translate('management.headerAppActions.newAriaLabel', {
        defaultMessage: 'New',
      })}
      data-test-subj="headerGlobalNav-appActionsNewButton"
    >
      {i18n.translate('management.headerAppActions.newLabel', {
        defaultMessage: 'New',
      })}
    </EuiButtonIcon>,
  ],
});
