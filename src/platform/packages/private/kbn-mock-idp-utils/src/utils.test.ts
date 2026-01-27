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
import {
  createMockIdpMetadata,
  createSAMLResponse,
  ensureSAMLRoleMapping,
  getSAMLRequestId,
} from './utils';

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
          organizationId: 'org1234567890',
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

      it('should configure specified expiration dates for JWT access and refresh tokens', async () => {
        // 1. Generate SAML response with short-lived access token.
        const samlResponse = await createSAMLResponse({
          ...serverlessOptions,
          serverless: {
            ...serverlessOptions.serverless,
            accessTokenLifetimeSec: 5,
            refreshTokenLifetimeSec: 10,
          },
        });

        // 2. Extract raw encoded access and refresh tokens.
        const [, accessTokenMatch] = Buffer.from(samlResponse, 'base64')
          .toString('utf-8')
          .match(
            new RegExp(
              `${MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN}.*?<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>`,
              's'
            )
          )!;
        const [, refreshTokenMatch] = Buffer.from(samlResponse, 'base64')
          .toString('utf-8')
          .match(
            new RegExp(
              `${MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN}.*?<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>`,
              's'
            )
          )!;

        // 3. Unwrap the tokens and extract payloads (format: header.payload.signature).
        const [, encodedAccessTokenPayload] = decodeWithChecksum(
          removePrefixEssuDev(accessTokenMatch)
        ).split('.');
        const [, encodedRefreshTokenPayload] = decodeWithChecksum(
          removePrefixEssuDev(refreshTokenMatch)
        ).split('.');

        // 4. Verify that exp = iat + 5 seconds.
        const accessTokenPayload = JSON.parse(
          Buffer.from(encodedAccessTokenPayload, 'base64url').toString()
        );
        expect(accessTokenPayload.exp).toBe(accessTokenPayload.iat + 5);

        const refreshTokenPayload = JSON.parse(
          Buffer.from(encodedRefreshTokenPayload, 'base64url').toString()
        );
        expect(refreshTokenPayload.exp).toBe(refreshTokenPayload.iat + 10);
      });

      it('should not include UIAM tokens when uiamEnabled is false', async () => {
        const nonUiamOptions = {
          ...baseOptions,
          serverless: {
            organizationId: 'org1234567890',
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

  describe('getSAMLReuestId', () => {
    it('should extract SAMLRequest ID from URL', async () => {
      const url =
        'http://localhost:5601/mock_idp/login?SAMLRequest=fZJvT8IwEMa%2FSnPvYVsnExqGQYmRxD8Epi98Q0q5SWPXzl6H8u2dggYT4tvePc9z97sOLz4qw7boSTubQ9KNgaFVbq3tSw6PxXWnDxejIcnK8FqMm7Cxc3xrkAJrhZbEvpJD461wkjQJKyskEZRYjO9uBe%2FGovYuOOUMsDER%2BtBGXTlLTYV%2BgX6rFT7Ob3PYhFCLKDJOSbNxFEQvi5NI1joiVI3XYRd9pUVt2aykegU2aefQVobv2U%2FLK6del3pdt%2B8v2gKbTnJYxhivB6XkPDtL0wT755hgT2a9lA9kkpWDslTIy7TfthM1OLUUpA058JhnnTjpJL0iyQTvi5R3z1P%2BDGx2WPFS2z26%2F3is9k0kbopi1pk9LApgTz8naBvgAFx8p%2Ftj0v8byx%2B8MDpJYxgd%2B%2F6e9b41mk5mzmi1Y2Nj3PuVRxkwh1IaQohGB%2BHfHzD6BA%3D%3D';
      const requestId = await getSAMLRequestId(url);
      expect(requestId).toEqual('_0e0d9fa2264331e87e1e5a65329a16f9ffce2f38');
    });

    it('should return undefined if SAMLRequest parameter is missing', async () => {
      const noParamUrl = 'http://localhost:5601/mock_idp/login';
      const requestId = await getSAMLRequestId(noParamUrl);
      expect(requestId).toBeUndefined();
    });

    it('should return undefined if SAMLRequest parameter is invalid', async () => {
      const invalidUrl = 'http://localhost:5601/mock_idp/login?SAMLRequest=YmxhaCBibGFoIGJsYWg=';
      const requestId = await getSAMLRequestId(invalidUrl);
      expect(requestId).toBeUndefined();
    });
  });
});
