/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const API_KEY_HEADER_AUTHENTICATION_LABEL = i18n.translate(
  'connectorSpecs.apiKeyHeaderAuthentication.label',
  {
    defaultMessage: 'API key header authentication',
  }
);

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

export const BEARER_TOKEN_LABEL = i18n.translate('connectorSpecs.bearerAuth.token.label', {
  defaultMessage: 'Token',
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

export const OAUTH_LABEL = i18n.translate('connectorSpecs.oauth.label', {
  defaultMessage: 'OAuth Client Credentials',
});

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

export const CRT_AUTH_LABEL = i18n.translate('connectorSpecs.crt.label', {
  defaultMessage: 'SSL CRT and Key authentication',
});

export const CRT_AUTH_CERT_LABEL = i18n.translate('connectorSpecs.crtCert.label', {
  defaultMessage: 'CRT file',
});

export const CRT_AUTH_KEY_LABEL = i18n.translate('connectorSpecs.crtKey.label', {
  defaultMessage: 'KEY file',
});

export const CRT_AUTH_PASSPHRASE_LABEL = i18n.translate('connectorSpecs.crtPassphrase.label', {
  defaultMessage: 'Passphrase',
});

export const CRT_AUTH_CA_LABEL = i18n.translate('connectorSpecs.crtCA.label', {
  defaultMessage: 'CA file',
});

export const CRT_AUTH_VERIFICATION_MODE_LABEL = i18n.translate(
  'connectorSpecs.crtVerificationMode.label',
  {
    defaultMessage: 'Verification mode',
  }
);

export const PFX_AUTH_LABEL = i18n.translate('connectorSpecs.pfx.label', {
  defaultMessage: 'SSL PFX authentication',
});

export const PFX_AUTH_CERT_LABEL = i18n.translate('connectorSpecs.crtCert.label', {
  defaultMessage: 'PFX file',
});

export const PFX_AUTH_PASSPHRASE_LABEL = i18n.translate('connectorSpecs.pfxPassphrase.label', {
  defaultMessage: 'Passphrase',
});

export const PFX_AUTH_CA_LABEL = i18n.translate('connectorSpecs.pfxCA.label', {
  defaultMessage: 'CA file',
});

export const PFX_AUTH_VERIFICATION_MODE_LABEL = i18n.translate(
  'connectorSpecs.pfxVerificationMode.label',
  {
    defaultMessage: 'Verification mode',
  }
);
