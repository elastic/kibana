/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { httpServiceMock } from '@kbn/core/public/mocks';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { connectorsSpecs, serializeConnectorSpec } from '@kbn/connector-specs';
import type { ConnectorSpecWireResponse } from '../apis/fetch_connector_spec';
import {
  fetchConnectorSpec,
  transformSpecToActionTypeModel,
  type ConnectorSpecResponse,
} from './action_type_model_utils';

type LooseConnectorFormTransform = (data: Record<string, unknown>) => Record<string, unknown>;

function minimalConnectorSpecForForm(): ConnectorSpecResponse {
  return {
    metadata: {
      id: 'test-connector',
      displayName: 'Test',
      description: 'Test',
      minimumLicense: 'basic',
      supportedFeatureIds: ['alerting'],
    },
    schema: { type: 'object', properties: {} },
  };
}

describe('action_type_model_utils', () => {
  describe('fetchConnectorSpec', () => {
    const http = httpServiceMock.createStartContract();

    const mockWireResponse = (): ConnectorSpecWireResponse => ({
      metadata: {
        id: 'test-connector',
        display_name: 'Test Connector',
        description: 'A test connector',
        minimum_license: 'basic',
        supported_feature_ids: ['alerting'],
      },
      schema: { type: 'object', properties: {} },
    });

    const expectedClientSpec = (): ConnectorSpecResponse => ({
      metadata: {
        id: 'test-connector',
        displayName: 'Test Connector',
        description: 'A test connector',
        minimumLicense: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      schema: { type: 'object', properties: {} },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls the connector spec API and returns the response', async () => {
      http.get.mockResolvedValue(mockWireResponse());

      const result = await fetchConnectorSpec(http, 'test-connector');

      expect(http.get.mock.calls[0][0]).toBe(
        '/internal/actions/connector_types/test-connector/spec'
      );
      expect(result).toEqual(expectedClientSpec());
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

    it('maps base spec metadata, source, subtype, and validateParams', async () => {
      const model = transformSpecToActionTypeModel(baseSpec);
      expect(model.id).toBe('test-connector');
      expect(model.actionTypeTitle).toBe('Test Connector');
      expect(model.selectMessage).toBe('A test connector description');
      expect(model.source).toBe(ACTION_TYPE_SOURCES.spec);
      expect(model.subtype).toBeUndefined();
      expect(await model.validateParams({}, null)).toEqual({ errors: {} });
    });

    it('sets isExperimental from is_technical_preview metadata', () => {
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

    it('uses metadata icon when set, otherwise plugs when id is not in the icon map', () => {
      const withIcon = transformSpecToActionTypeModel({
        ...baseSpec,
        metadata: { ...baseSpec.metadata, icon: 'custom-icon' },
      });
      expect(withIcon.iconClass).toBe('custom-icon');
      expect(transformSpecToActionTypeModel(baseSpec).iconClass).toBe('plugs');
    });
  });

  describe('connectorForm serializer and deserializer', () => {
    const formModel = () => transformSpecToActionTypeModel(minimalConnectorSpecForForm());

    it('serializer copies secrets.authType into config or returns data unchanged', () => {
      const serializer = formModel().connectorForm?.serializer as
        | LooseConnectorFormTransform
        | undefined;

      const withAuthType = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { authType: 'api_key', apiKey: 'secret' },
      };
      expect(serializer?.(withAuthType)).toEqual({
        ...withAuthType,
        config: { someField: 'value', authType: 'api_key' },
      });

      const withoutAuthType = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { apiKey: 'secret' },
      };
      expect(serializer?.(withoutAuthType)).toEqual(withoutAuthType);
    });

    it('deserializer merges config.authType into secrets when absent, preserves existing secrets.authType, or no-ops', () => {
      const deserializer = formModel().connectorForm?.deserializer as
        | LooseConnectorFormTransform
        | undefined;

      const emptySecrets = {
        name: 'My Connector',
        config: { someField: 'value', authType: 'api_key' },
        secrets: {},
      };
      expect(deserializer?.(emptySecrets)?.secrets).toEqual({ authType: 'api_key' });
      expect(deserializer?.(emptySecrets)?.config).toEqual({
        someField: 'value',
        authType: 'api_key',
      });

      const mergeSecrets = {
        name: 'My Connector',
        config: { authType: 'api_key' },
        secrets: { apiKey: 'stored-secret' },
      };
      expect(deserializer?.(mergeSecrets)?.secrets).toEqual({
        apiKey: 'stored-secret',
        authType: 'api_key',
      });

      const secretsAlreadyHasAuth = {
        name: 'My Connector',
        config: { authType: 'api_key' },
        secrets: { authType: 'bearer_token' },
      };
      expect(deserializer?.(secretsAlreadyHasAuth)).toEqual(secretsAlreadyHasAuth);

      const noAuthInConfig = {
        name: 'My Connector',
        config: { someField: 'value' },
        secrets: { apiKey: 'secret' },
      };
      expect(deserializer?.(noAuthInConfig)).toEqual(noAuthInConfig);
    });
  });
});
