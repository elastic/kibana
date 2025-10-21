/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac } from 'crypto';

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
import { decodeWithChecksum } from './jwt-codecs/encoder-checksum';
import { removePrefixEssuDev } from './jwt-codecs/encoder-prefix';
import { createMockIdpMetadata, createSAMLResponse, ensureSAMLRoleMapping } from './utils';

describe('mock-idp-utils', () => {
  describe('createMockIdpMetadata', () => {
    it('should generate valid XML metadata with correct entity ID', async () => {
      const kibanaUrl = 'http://localhost:5601';
      const metadata = await createMockIdpMetadata(kibanaUrl);

      expect(metadata).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(metadata).toContain(`entityID="${MOCK_IDP_ENTITY_ID}"`);
      expect(metadata).toContain('md:IDPSSODescriptor');
      expect(metadata).toContain('WantAuthnRequestsSigned="false"');
    });

    it('should include correct SSO service locations', async () => {
      const kibanaUrl = 'http://localhost:5601';
      const metadata = await createMockIdpMetadata(kibanaUrl);

      expect(metadata).toContain(`Location="${kibanaUrl}${MOCK_IDP_LOGIN_PATH}"`);
      expect(metadata).toContain(`Location="${kibanaUrl}${MOCK_IDP_LOGOUT_PATH}"`);
      expect(metadata).toContain('HTTP-POST');
      expect(metadata).toContain('HTTP-Redirect');
    });

    it('should trim trailing slash from kibana URL', async () => {
      const kibanaUrl = 'http://localhost:5601/';
      const metadata = await createMockIdpMetadata(kibanaUrl);

      expect(metadata).toContain('http://localhost:5601/mock_idp');
      expect(metadata).not.toContain('http://localhost:5601//mock_idp');
    });

    it('should include X509 certificate data', async () => {
      const kibanaUrl = 'http://localhost:5601';
      const metadata = await createMockIdpMetadata(kibanaUrl);

      expect(metadata).toContain('ds:X509Certificate');
      expect(metadata).toContain('KeyDescriptor');
    });
  });

  describe('createSAMLResponse', () => {
    const baseOptions = {
      kibanaUrl: 'http://localhost:5601/api/security/saml/callback',
      username: 'testuser',
      full_name: 'Test User',
      email: 'test@elastic.co',
      roles: ['viewer', 'editor'],
    };

    it('should generate a base64-encoded SAML response', async () => {
      const samlResponse = await createSAMLResponse(baseOptions);

      expect(typeof samlResponse).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(samlResponse, 'base64')).not.toThrow();
    });

    it('should include SAML response structure', async () => {
      const samlResponse = await createSAMLResponse(baseOptions);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).toContain('samlp:Response');
      expect(decoded).toContain('saml:Assertion');
      expect(decoded).toContain(`<saml:Issuer>${MOCK_IDP_ENTITY_ID}</saml:Issuer>`);
      expect(decoded).toContain(
        'samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"'
      );
    });

    it('should include username in principal attribute', async () => {
      const samlResponse = await createSAMLResponse(baseOptions);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_PRINCIPAL}"`);
      expect(decoded).toContain(
        `<saml:AttributeValue xsi:type="xs:string">${baseOptions.username}</saml:AttributeValue>`
      );
    });

    it('should include all roles in roles attribute', async () => {
      const samlResponse = await createSAMLResponse(baseOptions);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_ROLES}"`);
      baseOptions.roles.forEach((role) => {
        expect(decoded).toContain(
          `<saml:AttributeValue xsi:type="xs:string">${role}</saml:AttributeValue>`
        );
      });
    });

    it('should include email attribute when provided', async () => {
      const samlResponse = await createSAMLResponse(baseOptions);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_EMAIL}"`);
      expect(decoded).toContain(baseOptions.email);
    });

    it('should include name attribute when provided', async () => {
      const samlResponse = await createSAMLResponse(baseOptions);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_NAME}"`);
      expect(decoded).toContain(baseOptions.full_name);
    });

    it('should omit email attribute when not provided', async () => {
      const optionsWithoutEmail = { ...baseOptions, email: undefined };
      const samlResponse = await createSAMLResponse(optionsWithoutEmail);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).not.toContain(`Name="${MOCK_IDP_ATTRIBUTE_EMAIL}"`);
    });

    it('should omit name attribute when not provided', async () => {
      const optionsWithoutName = { ...baseOptions, full_name: undefined };
      const samlResponse = await createSAMLResponse(optionsWithoutName);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).not.toContain(`Name="${MOCK_IDP_ATTRIBUTE_NAME}"`);
    });

    it('should include InResponseTo when authnRequestId is provided', async () => {
      const authnRequestId = '_test_request_id_12345';
      const samlResponse = await createSAMLResponse({
        ...baseOptions,
        authnRequestId,
      });
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).toContain(`InResponseTo="${authnRequestId}"`);
    });

    it('should include signature element', async () => {
      const samlResponse = await createSAMLResponse(baseOptions);
      const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

      expect(decoded).toContain('Signature');
      expect(decoded).toContain('SignatureValue');
      expect(decoded).toContain('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
    });

    describe('with UIAM enabled', () => {
      const serverlessOptions = {
        ...baseOptions,
        serverless: {
          organizationId: '1234567890',
          projectType: 'observability',
          uiamEnabled: true,
        },
      };

      it('should include UIAM access token attribute', async () => {
        const samlResponse = await createSAMLResponse(serverlessOptions);
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

        expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN}"`);
      });

      it('should include UIAM refresh token attribute', async () => {
        const samlResponse = await createSAMLResponse(serverlessOptions);
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

        expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN}"`);
      });

      it('should include UIAM token expiration attributes', async () => {
        const samlResponse = await createSAMLResponse(serverlessOptions);
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

        expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN_EXPIRES_AT}"`);
        expect(decoded).toContain(`Name="${MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN_EXPIRES_AT}"`);
      });

      it('should generate access token with essu_dev_ prefix', async () => {
        const samlResponse = await createSAMLResponse(serverlessOptions);
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

        const accessTokenMatch = decoded.match(
          new RegExp(
            `${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN}.*?<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>`,
            's'
          )
        );
        expect(accessTokenMatch).toBeTruthy();
        const accessToken = accessTokenMatch![1];
        expect(accessToken).toMatch(/^essu_dev_/);
      });

      it('should generate valid JWT access token with correct structure', async () => {
        const samlResponse = await createSAMLResponse(serverlessOptions);
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

        const accessTokenMatch = decoded.match(
          new RegExp(
            `${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN}.*?<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>`,
            's'
          )
        );
        const wrappedToken = accessTokenMatch![1];

        // Unwrap the token
        const unprefixed = removePrefixEssuDev(wrappedToken);
        const jwt = decodeWithChecksum(unprefixed);

        // JWT should have 3 parts: header.payload.signature
        const parts = jwt.split('.');
        expect(parts).toHaveLength(3);

        // Decode header
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        expect(header.typ).toBe('JWT');
        expect(header.alg).toBe('HS256');

        // Decode payload
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        expect(payload.typ).toBe('access-token');
        expect(payload.iss).toBe('elastic-cloud');
        expect(payload.sjt).toBe('user');
        expect(payload.sub).toBe(serverlessOptions.username);
        expect(payload.oid).toBe(serverlessOptions.serverless.organizationId);
        expect(payload.email).toBe(serverlessOptions.email);
        expect(payload.given_name).toBe('Test');
        expect(payload.family_name).toBe('User');
        expect(payload.ras).toBeDefined();
        expect(payload.ras.project).toHaveLength(1);
        expect(payload.ras.project[0].role_id).toBe('cloud-role-id');
        expect(payload.ras.project[0].organization_id).toBe(
          serverlessOptions.serverless.organizationId
        );
        expect(payload.ras.project[0].project_type).toBe(serverlessOptions.serverless.projectType);
        expect(payload.ras.project[0].application_roles).toEqual(serverlessOptions.roles);

        // Verify signature
        const signature = parts[2];
        const expectedSignature = createHmac('sha256', MOCK_IDP_UIAM_SIGNING_SECRET)
          .update(`${parts[0]}.${parts[1]}`)
          .digest('base64url');

        expect(signature).toBe(expectedSignature);
      });

      it('should generate refresh token with valid JWT structure', async () => {
        const samlResponse = await createSAMLResponse(serverlessOptions);
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

        const refreshTokenMatch = decoded.match(
          new RegExp(
            `${MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN}.*?<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>`,
            's'
          )
        );
        const wrappedToken = refreshTokenMatch![1];

        // Unwrap the token
        const unprefixed = removePrefixEssuDev(wrappedToken);
        const jwt = decodeWithChecksum(unprefixed);

        // JWT should have 3 parts: header.payload.signature
        const parts = jwt.split('.');
        expect(parts).toHaveLength(3);

        // Decode payload
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        expect(payload.typ).toBe('refresh-token');
        expect(payload.iss).toBe('elastic-cloud');
        expect(payload.sjt).toBe('user');
        expect(payload.sub).toBe(serverlessOptions.username);
      });

      it('should not include UIAM tokens when uiamEnabled is false', async () => {
        const nonUiamOptions = {
          ...baseOptions,
          serverless: {
            organizationId: '1234567890',
            projectType: 'observability',
            uiamEnabled: false,
          },
        };
        const samlResponse = await createSAMLResponse(nonUiamOptions);
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

        expect(decoded).not.toContain(`Name="${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN}"`);
        expect(decoded).not.toContain(`Name="${MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN}"`);
      });
    });
  });

  describe('ensureSAMLRoleMapping', () => {
    it('should create role mapping with correct configuration', async () => {
      const mockClient = {
        transport: {
          request: jest.fn().mockResolvedValue({}),
        },
      } as any;

      await ensureSAMLRoleMapping(mockClient);

      expect(mockClient.transport.request).toHaveBeenCalledWith({
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
    });

    it('should handle errors from Elasticsearch client', async () => {
      const mockError = new Error('Elasticsearch error');
      const mockClient = {
        transport: {
          request: jest.fn().mockRejectedValue(mockError),
        },
      } as any;

      await expect(ensureSAMLRoleMapping(mockClient)).rejects.toThrow('Elasticsearch error');
    });
  });
});
