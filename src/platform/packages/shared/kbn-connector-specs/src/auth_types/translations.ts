/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const API_KEY_AUTH_LABEL = i18n.translate('connectorSpecs.apiKeyAuth.label', {
  defaultMessage: 'API key',
});

export const API_KEY_AUTH_REQUIRED_MESSAGE = i18n.translate(
  'connectorSpecs.apiKeyAuth.requiredMessage',
  {
    defaultMessage: 'API key is required',
  }
);

export const HEADER_AUTH_LABEL = i18n.translate('connectorSpecs.headerAuth.label', {
  defaultMessage: 'API key header Field',
});

export const HEADER_AUTH_REQUIRED_MESSAGE = i18n.translate(
  'connectorSpecs.headerAuth.headerAuth.requiredMessage',
  {
    defaultMessage: 'Header field is required',
  }
);

export const BASIC_AUTH_LABEL = i18n.translate('connectorSpecs.basicAuth.label', {
  defaultMessage: 'Basic authentication',
});

export const BASIC_AUTH_USERNAME_LABEL = i18n.translate('connectorSpecs.basicAuth.username.label', {
  defaultMessage: 'Username',
});

export const BASIC_AUTH_USERNAME_REQUIRED_MESSAGE = i18n.translate(
  'connectorSpecs.basicAuth.username.requiredMessage',
  {
    defaultMessage: 'Username is required',
  }
);

export const BASIC_AUTH_PASSWORD_LABEL = i18n.translate('connectorSpecs.basicAuth.password.label', {
  defaultMessage: 'Password',
});

export const BASIC_AUTH_PASSWORD_REQUIRED_MESSAGE = i18n.translate(
  'connectorSpecs.basicAuth.password.requiredMessage',
  {
    defaultMessage: 'Password is required',
  }
);

export const BEARER_AUTH_LABEL = i18n.translate('connectorSpecs.authType.bearerAuth.label', {
  defaultMessage: 'Bearer token',
});

export const BEARER_AUTH_REQUIRED_MESSAGE = i18n.translate(
  'connectorSpecs.bearerAuth.token.requiredMessage',
  {
    defaultMessage: 'Token is required',
  }
);

export const NO_AUTH_LABEL = i18n.translate('connectorSpecs.authType.noAuth.label', {
  defaultMessage: 'None',
});
