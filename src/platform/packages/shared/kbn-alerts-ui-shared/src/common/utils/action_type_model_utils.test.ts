/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';
import { z, ZodDiscriminatedUnion, ZodObject } from '@kbn/zod/v4';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import {
  type ConnectorZodSchema,
  connectorsSpecs,
  serializeConnectorSpec,
} from '@kbn/connector-specs';
import * as formGenerator from '@kbn/response-ops-form-generator';
import {
  fetchConnectorSpec,
  transformSpecToActionTypeModel,
  type ConnectorSpecResponse,
} from './action_type_model_utils';

jest.mock('@kbn/response-ops-form-generator', () => ({
  generateFormFields: jest.fn(() => null),
}));

const WORKFLOWS_CONNECTOR_FEATURE_ID = 'workflows';

type LooseConnectorFormTransform = (data: Record<string, unknown>) => Record<string, unknown>;

// Extracts allowed `authType` discriminator values from `secrets` so tests can assert that
// authMode narrowing keeps only the expected auth branches before fields are generated.
function getAllowedSecretsAuthTypes(schema: ConnectorZodSchema): string[] {
  const { secrets } = schema.shape;
  if (!(secrets instanceof ZodDiscriminatedUnion)) {
    throw new Error('expected secrets to be a discriminated union');
  }

  const discriminator = secrets.def.discriminator;
  return secrets.options.map((option) => {
    if (!(option instanceof ZodObject)) {
      throw new Error('expected discriminated union branches to be objects');
    }
    const discField = option.shape[discriminator];
    if (!(discField instanceof z.ZodLiteral) || typeof discField.value !== 'string') {
      throw new Error('expected auth discriminator values to be string literals');
    }
    return discField.value;
  });
}

describe('action_type_model_utils', () => {
  describe('fetchConnectorSpec', () => {
    const http = httpServiceMock.createStartContract();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls the correct API endpoint with connector ID', async () => {
      const mockResponse: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: {
          type: 'object',
          properties: {},
        },
      };
      http.get.mockResolvedValue(mockResponse);

      const result = await fetchConnectorSpec(http, 'test-connector');

      expect(http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/test-connector/spec',
        { signal: undefined }
      );
      expect(result).toEqual(mockResponse);
    });

    it('URL-encodes connector ID with special characters', async () => {
      const mockResponse: ConnectorSpecResponse = {
        metadata: {
          id: '.test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };
      http.get.mockResolvedValue(mockResponse);

      await fetchConnectorSpec(http, '.test-connector');

      expect(http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/.test-connector/spec',
        { signal: undefined }
      );
    });

    it('passes abort signal when provided', async () => {
      const mockResponse: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };
      http.get.mockResolvedValue(mockResponse);

      const abortController = new AbortController();
      await fetchConnectorSpec(http, 'test-connector', abortController.signal);

      expect(http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/test-connector/spec',
        { signal: abortController.signal }
      );
    });
  });

  describe('transformSpecToActionTypeModel', () => {
    const baseSpec: ConnectorSpecResponse = {
      metadata: {
        id: 'test-connector',
        displayName: 'Test Connector',
        description: 'A test connector description',
        minimumLicense: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      schema: {
        type: 'object',
        properties: {
          config: { type: 'object', properties: {} },
          secrets: { type: 'object', properties: {} },
        },
      },
    };

    it('creates ActionTypeModel with correct id', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.id).toBe('test-connector');
    });

    it('creates ActionTypeModel with correct title from displayName', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.actionTypeTitle).toBe('Test Connector');
    });

    it('creates ActionTypeModel with correct selectMessage from description', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.selectMessage).toBe('A test connector description');
    });

    it('sets source to spec', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.source).toBe(ACTION_TYPE_SOURCES.spec);
    });

    it('sets isExperimental from isTechnicalPreview', () => {
      const validSchema = serializeConnectorSpec(connectorsSpecs.AlienVaultOTXConnector)
        .schema as Record<string, unknown>;
      const modelDefault = transformSpecToActionTypeModel({ ...baseSpec, schema: validSchema });
      expect(modelDefault.isExperimental).toBe(false);

      const modelPreview = transformSpecToActionTypeModel({
        ...baseSpec,
        schema: validSchema,
        metadata: { ...baseSpec.metadata, isTechnicalPreview: true },
      });
      expect(modelPreview.isExperimental).toBe(true);
    });

    it('sets subtype to undefined', () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.subtype).toBeUndefined();
    });

    it('creates validateParams function that returns empty errors', async () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      const result = await model.validateParams({}, null);
      expect(result).toEqual({ errors: {} });
    });

    describe('icon resolution', () => {
      it('uses icon from spec metadata when provided', () => {
        const specWithIcon: ConnectorSpecResponse = {
          ...baseSpec,
          metadata: {
            ...baseSpec.metadata,
            icon: 'custom-icon',
          },
        };
        const model = transformSpecToActionTypeModel(specWithIcon);
        expect(model.iconClass).toBe('custom-icon');
      });

      it('falls back to plugs icon when no icon specified and not in icon map', () => {
        const model = transformSpecToActionTypeModel(baseSpec);
        // Since test-connector is not in ConnectorIconsMap, it should fall back to 'plugs'
        expect(model.iconClass).toBe('plugs');
      });
    });

    describe('actionConnectorFields authMode narrowing', () => {
      const sharepointSpecResponse = (): ConnectorSpecResponse => ({
        metadata: {
          id: '.sharepoint-online',
          displayName: 'SharePoint Online',
          description: 'Test connector',
          minimumLicense: 'enterprise',
          supportedFeatureIds: ['alerting'],
          isTechnicalPreview: true,
        },
        schema: serializeConnectorSpec(connectorsSpecs.SharepointOnline).schema as Record<
          string,
          unknown
        >,
      });

      beforeEach(() => {
        jest.mocked(formGenerator.generateFormFields).mockClear();
      });

      async function renderConnectorFieldsAndGetSchemaLiterals(
        authMode: 'shared' | 'per-user' | undefined
      ) {
        const model = transformSpecToActionTypeModel(sharepointSpecResponse());
        const LazyFields = model.actionConnectorFields;
        if (!LazyFields) {
          throw new Error('expected actionConnectorFields');
        }
        render(
          React.createElement(
            Suspense,
            { fallback: null },
            React.createElement(LazyFields, {
              readOnly: false,
              isEdit: false,
              authMode,
              registerPreSubmitValidator: jest.fn(),
            })
          )
        );
        await waitFor(() =>
          expect(jest.mocked(formGenerator.generateFormFields)).toHaveBeenCalled()
        );
        const passedSchema = jest.mocked(formGenerator.generateFormFields).mock.calls[0][0]
          .schema as ConnectorZodSchema;
        return getAllowedSecretsAuthTypes(passedSchema);
      }

      it('passes a full secrets union to generateFormFields when authMode is undefined', async () => {
        const literals = await renderConnectorFieldsAndGetSchemaLiterals(undefined);
        expect(literals).toContain('oauth_client_credentials');
        expect(literals).toContain('oauth_authorization_code');
      });

      it("passes only shared auth branches to generateFormFields when authMode is 'shared'", async () => {
        const literals = await renderConnectorFieldsAndGetSchemaLiterals('shared');
        expect(literals).toContain('oauth_client_credentials');
        expect(literals).not.toContain('oauth_authorization_code');
        expect(literals).not.toContain('ears');
      });

      it("passes only per-user auth branches to generateFormFields when authMode is 'per-user'", async () => {
        const literals = await renderConnectorFieldsAndGetSchemaLiterals('per-user');
        expect(literals).not.toContain('oauth_client_credentials');
        expect(literals).toContain('oauth_authorization_code');
      });
    });

    describe('getHideInUi', () => {
      const workflowsOnlySpec: ConnectorSpecResponse = {
        ...baseSpec,
        metadata: {
          ...baseSpec.metadata,
          supportedFeatureIds: [WORKFLOWS_CONNECTOR_FEATURE_ID],
        },
      };

      it('returns false when workflows UI is enabled', () => {
        const uiSettings = { get: jest.fn().mockReturnValue(true) };
        const model = transformSpecToActionTypeModel(workflowsOnlySpec, uiSettings as any);
        expect(model.getHideInUi?.([])).toBe(false);
        expect(uiSettings.get).toHaveBeenCalledWith('workflows:ui:enabled', true);
      });

      it('returns true when workflows UI is disabled', () => {
        const uiSettings = { get: jest.fn().mockReturnValue(false) };
        const model = transformSpecToActionTypeModel(workflowsOnlySpec, uiSettings as any);
        expect(model.getHideInUi?.([])).toBe(true);
      });

      it('returns false for workflows-only spec when uiSettings is undefined', () => {
        const model = transformSpecToActionTypeModel(workflowsOnlySpec);
        expect(model.getHideInUi?.([])).toBe(false);
      });

      it('returns false when supportedFeatureIds is not workflows-only', () => {
        const uiSettings = { get: jest.fn().mockReturnValue(false) };
        const model = transformSpecToActionTypeModel(baseSpec, uiSettings as any);
        expect(model.getHideInUi?.([])).toBe(false);
        expect(uiSettings.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('connectorForm serializer', () => {
    it('copies authType from secrets to config when present', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const serializer = model.connectorForm?.serializer as LooseConnectorFormTransform | undefined;

      const formData = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { authType: 'api_key', apiKey: 'secret' },
      };

      const result = serializer?.(formData);

      expect(result?.config).toEqual({
        someField: 'value',
        authType: 'api_key',
      });
      expect(result?.secrets).toEqual({ authType: 'api_key', apiKey: 'secret' });
    });

    it('does not modify data when authType is not present in secrets', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const serializer = model.connectorForm?.serializer as LooseConnectorFormTransform | undefined;

      const formData = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { apiKey: 'secret' },
      };

      const result = serializer?.(formData);

      expect(result).toEqual(formData);
    });
  });

  describe('connectorForm deserializer', () => {
    it('copies authType from config to secrets when present and secrets does not have it', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const deserializer = model.connectorForm?.deserializer as
        | LooseConnectorFormTransform
        | undefined;

      const apiData = {
        name: 'My Connector',
        config: { someField: 'value', authType: 'api_key' },
        secrets: {},
      };

      const result = deserializer?.(apiData);

      expect(result?.secrets).toEqual({ authType: 'api_key' });
      expect(result?.config).toEqual({ someField: 'value', authType: 'api_key' });
    });

    it('merges authType into existing secrets without removing other secret keys', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const deserializer = model.connectorForm?.deserializer as
        | LooseConnectorFormTransform
        | undefined;

      const apiData = {
        name: 'My Connector',
        config: { authType: 'api_key' },
        secrets: { apiKey: 'stored-secret' },
      };

      const result = deserializer?.(apiData);

      expect(result?.secrets).toEqual({ apiKey: 'stored-secret', authType: 'api_key' });
    });

    it('does not overwrite authType in secrets if already present', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const deserializer = model.connectorForm?.deserializer as
        | LooseConnectorFormTransform
        | undefined;

      const apiData = {
        name: 'My Connector',
        config: { authType: 'api_key' },
        secrets: { authType: 'bearer_token' },
      };

      const result = deserializer?.(apiData);

      expect(result?.secrets).toEqual({ authType: 'bearer_token' });
    });

    it('does not modify data when config has no authType', () => {
      const spec: ConnectorSpecResponse = {
        metadata: {
          id: 'test-connector',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        schema: { type: 'object', properties: {} },
      };

      const model = transformSpecToActionTypeModel(spec);
      const deserializer = model.connectorForm?.deserializer as
        | LooseConnectorFormTransform
        | undefined;

      const apiData = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { apiKey: 'secret' },
      };

      const result = deserializer?.(apiData);

      expect(result).toEqual(apiData);
    });
  });
});
