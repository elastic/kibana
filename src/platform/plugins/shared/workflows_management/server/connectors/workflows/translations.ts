/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.stackConnectors.workflows.title', {
  defaultMessage: 'Workflows',
});

export const WORKFLOWS_MANAGEMENT_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.workflows.error.requiredWorkflowsManagementUrlText',
  {
    defaultMessage: 'Workflows Management URL is required.',
  }
);

export const INVALID_URL = (url: string, err: string) =>
  i18n.translate('xpack.stackConnectors.workflows.error.invalidUrlErrorMessage', {
    defaultMessage: 'Invalid URL {url}. Error: {err}',
    values: {
      url,
      err,
    },
  });

export const PASSWORD_REQUIRED_WHEN_USER_PROVIDED = i18n.translate(
  'xpack.stackConnectors.workflows.error.passwordRequiredWhenUserProvidedText',
  {
    defaultMessage: 'Password is required when username is provided.',
  }
);
