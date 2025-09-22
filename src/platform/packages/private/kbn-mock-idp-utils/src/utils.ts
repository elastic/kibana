/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { createHmac, randomBytes, X509Certificate } from 'crypto';
import { readFile } from 'fs/promises';
import { SignedXml } from 'xml-crypto';

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';

import {
  MOCK_IDP_ATTRIBUTE_EMAIL,
  MOCK_IDP_ATTRIBUTE_NAME,
  MOCK_IDP_ATTRIBUTE_PRINCIPAL,
  MOCK_IDP_ATTRIBUTE_ROLES,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN_EXPIRES_AT,
  MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN,
  MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN_EXPIRES_AT,
  MOCK_IDP_ENTITY_ID,
  MOCK_IDP_LOGIN_PATH,
  MOCK_IDP_LOGOUT_PATH,
  MOCK_IDP_REALM_NAME,
  MOCK_IDP_ROLE_MAPPING_NAME,
  MOCK_IDP_UIAM_SIGNING_SECRET,
} from './constants';

/**
 * Creates XML metadata for our mock identity provider.
 *
 * This can be saved to file and used to configure Elasticsearch SAML realm.
 *
 * @param kibanaUrl Fully qualified URL where Kibana is hosted (including base path)
 */
export async function createMockIdpMetadata(kibanaUrl: string) {
  const signingKey = await readFile(KBN_CERT_PATH);
  const cert = new X509Certificate(signingKey);
  const trimTrailingSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

  return `<?xml version="1.0" encoding="UTF-8"?>
  <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="${MOCK_IDP_ENTITY_ID}">
    <md:IDPSSODescriptor WantAuthnRequestsSigned="false"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
      <md:KeyDescriptor use="signing">
        <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
          <ds:X509Data>
            <ds:X509Certificate>${cert.raw.toString('base64')}</ds:X509Certificate>
          </ds:X509Data>
        </ds:KeyInfo>
      </md:KeyDescriptor>
      <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${trimTrailingSlash(kibanaUrl)}${MOCK_IDP_LOGOUT_PATH}" />
      <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="${trimTrailingSlash(kibanaUrl)}${MOCK_IDP_LOGOUT_PATH}" />
      <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${trimTrailingSlash(kibanaUrl)}${MOCK_IDP_LOGIN_PATH}" />
      <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="${trimTrailingSlash(kibanaUrl)}${MOCK_IDP_LOGIN_PATH}" />
    </md:IDPSSODescriptor>
  </md:EntityDescriptor>
  `;
}

/**
 * Creates a SAML response that can be passed directly to the Kibana ACS endpoint to authenticate a user.
 *
 * @example Create a SAML response.
 *
 * ```ts
 * const samlResponse = await createSAMLResponse({
 *    username: '1234567890',
 *    email: 'mail@elastic.co',
 *    full_name: 'Test User',
 *    roles: ['t1_analyst', 'editor'],
 *  })
 * ```
 *
 * @example Authenticate user with SAML response.
 *
 * ```ts
 * fetch('/api/security/saml/callback', {
 *   method: 'POST',
 *   body: JSON.stringify({ SAMLResponse: samlResponse }),
 * })
 * ```
 */
export async function createSAMLResponse(options: {
  /** Fully qualified URL where Kibana is hosted (including base path) */
  kibanaUrl: string;
  /** ID from SAML authentication request */
  authnRequestId?: string;
  username: string;
  full_name?: string;
  email?: string;
  roles: string[];
  serverless?: { organizationId: string; projectType: string; uiamEnabled: boolean };
}) {
  const issueInstant = new Date().toISOString();
  const notOnOrAfter = new Date(Date.now() + 3600 * 1000).toISOString();

  const uiamSessionTokens = options.serverless?.uiamEnabled
    ? createUiamSessionTokens({
        username: options.username,
        organizationId: options.serverless.organizationId,
        projectType: options.serverless.projectType,
        roles: options.roles,
        familyName: options.full_name,
        email: options.email,
      })
    : undefined;

  const samlAssertionTemplateXML = `
    <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" Version="2.0" ID="_RPs1WfOkul8lZ72DtJtes0BKyPgaCamg" IssueInstant="${issueInstant}">
      <saml:Issuer>${MOCK_IDP_ENTITY_ID}</saml:Issuer>
      <saml:Subject>
        <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:transient">_643ec1b3f5673583b9f9a1e9e73a36daa2a3748f</saml:NameID>
        <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
          <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}" ${
    options.authnRequestId ? `InResponseTo="${options.authnRequestId}"` : ''
  } Recipient="${options.kibanaUrl}" />
        </saml:SubjectConfirmation>
      </saml:Subject>
      <saml:AuthnStatement AuthnInstant="${issueInstant}" SessionIndex="4464894646681600">
        <saml:AuthnContext>
          <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified</saml:AuthnContextClassRef>
        </saml:AuthnContext>
      </saml:AuthnStatement>
      <saml:AttributeStatement xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <saml:Attribute FriendlyName="principal" Name="${MOCK_IDP_ATTRIBUTE_PRINCIPAL}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
          <saml:AttributeValue xsi:type="xs:string">${options.username}</saml:AttributeValue>
        </saml:Attribute>
        <saml:Attribute FriendlyName="roles" Name="${MOCK_IDP_ATTRIBUTE_ROLES}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
          ${options.roles
            .map(
              (role) => `<saml:AttributeValue xsi:type="xs:string">${role}</saml:AttributeValue>`
            )
            .join('')}
        </saml:Attribute>
        ${
          options.email
            ? `<saml:Attribute FriendlyName="email" Name="${MOCK_IDP_ATTRIBUTE_EMAIL}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xsi:type="xs:string">${options.email}</saml:AttributeValue>
      </saml:Attribute>`
            : ''
        }
        ${
          options.full_name
            ? `<saml:Attribute FriendlyName="name" Name="${MOCK_IDP_ATTRIBUTE_NAME}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xsi:type="xs:string">${options.full_name}</saml:AttributeValue>
      </saml:Attribute>`
            : ''
        }
        ${
          uiamSessionTokens
            ? `
        <saml:Attribute Name="${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
          <saml:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">${
            uiamSessionTokens.accessToken
          }</saml:AttributeValue>
        </saml:Attribute>
        <saml:Attribute Name="${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN_EXPIRES_AT}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
          <saml:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">${new Date(
            uiamSessionTokens.accessTokenExpiresAt
          ).toISOString()}</saml:AttributeValue>
        </saml:Attribute>
        <saml:Attribute Name="${MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
          <saml:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">${
            uiamSessionTokens.refreshToken
          }</saml:AttributeValue>
        </saml:Attribute>
        <saml:Attribute Name="${MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN_EXPIRES_AT}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
          <saml:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">${new Date(
            uiamSessionTokens.refreshTokenExpiresAt
          ).toISOString()}</saml:AttributeValue>
        </saml:Attribute>`
            : ''
        }
      </saml:AttributeStatement>
    </saml:Assertion>
  `;

  const signature = new SignedXml({ privateKey: await readFile(KBN_KEY_PATH) });
  signature.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  signature.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';

  // Adds a reference to a `Assertion` xml element and an array of transform algorithms to be used during signing.
  signature.addReference({
    xpath: `//*[local-name(.)='Assertion']`,
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });

  signature.computeSignature(samlAssertionTemplateXML, {
    location: { reference: `//*[local-name(.)='Issuer']`, action: 'after' },
  });

  return Buffer.from(
    `
    <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_bdf1d51245ed0f71aa23" Version="2.0" IssueInstant="${issueInstant}" ${
      options.authnRequestId ? `InResponseTo="${options.authnRequestId}"` : ''
    } Destination="${options.kibanaUrl}">
      <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${MOCK_IDP_ENTITY_ID}</saml:Issuer>
      <samlp:Status>
        <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
      </samlp:Status>${signature.getSignedXml()}
    </samlp:Response>
  `
  ).toString('base64');
}

/**
 * Creates the role mapping required for developers to authenticate using SAML.
 */
export async function ensureSAMLRoleMapping(client: Client) {
  return client.transport.request({
    method: 'PUT',
    path: `/_security/role_mapping/${MOCK_IDP_ROLE_MAPPING_NAME}`,
    body: {
      enabled: true,
      role_templates: [
        {
          template: '{"source":"{{#tojson}}groups{{/tojson}}"}',
          format: 'json',
        },
      ],
      rules: {
        all: [
          {
            field: {
              'realm.name': MOCK_IDP_REALM_NAME,
            },
          },
        ],
      },
    },
  });
}

function createUiamSessionTokens({
  username,
  organizationId,
  projectType,
  roles,
  familyName,
  email,
}: {
  username: string;
  organizationId: string;
  projectType: string;
  roles: string[];
  familyName?: string;
  email?: string;
}) {
  const iat = Math.floor(Date.now() / 1000);

  const accessTokenBody = Buffer.from(
    JSON.stringify({
      typ: 'access-token',
      iss: 'elastic-cloud',
      sjt: 'user',

      oid: organizationId,
      sub: username,
      family_name: familyName,
      email,

      ras: {
        platform: [],
        organization: [],
        user: [],
        project: [
          {
            role_id: 'cloud-role-id',
            organization_id: organizationId,
            project_type: projectType,
            application_roles: roles,
            project_scope: { scope: 'all' },
          },
        ],
      },

      nbf: iat,
      // 1H
      exp: iat + 3600,
      iat,

      jti: randomBytes(16).toString('hex'),
    })
  ).toString('base64url');

  const refreshTokenBody = Buffer.from(
    JSON.stringify({
      typ: 'refresh-token',
      iss: 'elastic-cloud',
      sjt: 'user',

      sub: username,

      nbf: iat,
      // 3D
      exp: iat + 3600 * 24 * 3,
      iat,

      jti: randomBytes(16).toString('hex'),
    })
  ).toString('base64url');

  const tokenHeader = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString(
    'base64url'
  );
  const accessToken = `${tokenHeader}.${accessTokenBody}`;
  const refreshToken = `${tokenHeader}.${refreshTokenBody}`;

  return {
    accessToken: `${accessToken}.${createHmac('sha256', MOCK_IDP_UIAM_SIGNING_SECRET)
      .update(accessToken)
      .digest('base64url')}`,
    accessTokenExpiresAt: (iat + 3600) * 1000,
    refreshToken: `${refreshToken}.${createHmac('sha256', MOCK_IDP_UIAM_SIGNING_SECRET)
      .update(refreshToken)
      .digest('base64url')}`,
    refreshTokenExpiresAt: (iat + 3600) * 1000,
  };
}
