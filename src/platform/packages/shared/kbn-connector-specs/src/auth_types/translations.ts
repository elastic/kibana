/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const OAUTH_TOKEN_URL_LABEL = i18n.translate('connectorSpecs.oauthTokenUrl.label', {
  defaultMessage: 'Token URL',
});

export const OAUTH_CLIENT_ID_LABEL = i18n.translate('connectorSpecs.oauthClientId.label', {
  defaultMessage: 'Client ID',
});

export const OAUTH_CLIENT_ID_REQUIRED_MESSAGE = i18n.translate(
  'connectorSpecs.oauthClientId.requiredMessage',
  {
    defaultMessage: 'Client ID is required',
  }
);

export const OAUTH_SCOPE_LABEL = i18n.translate('connectorSpecs.oauthScope.label', {
  defaultMessage: 'Scope',
});

export const OAUTH_CLIENT_SECRET_LABEL = i18n.translate('connectorSpecs.oauthClientSecret.label', {
  defaultMessage: 'Client secret',
});

export const OAUTH_CLIENT_SECRET_REQUIRED_MESSAGE = i18n.translate(
  'connectorSpecs.oauthClientSecret.requiredMessage',
  {
    defaultMessage: 'Client secret is required',
  }
);
