/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  MicrosoftDefenderEndpointConfigSchema,
  MicrosoftDefenderEndpointSecretsSchema,
  AgentDetailsParamsSchema,
  AgentListParamsSchema,
  IsolateHostParamsSchema,
  ReleaseHostParamsSchema,
  RunScriptParamsSchema,
  CancelParamsSchema,
  GetActionsParamsSchema,
  MicrosoftDefenderEndpointActionParamsSchema,
} from './v1';

describe('Microsoft Defender Endpoint Schema', () => {
  describe('MicrosoftDefenderEndpointConfigSchema', () => {
    const validConfig = {
      clientId: 'client-123',
      tenantId: 'tenant-456',
      oAuthServerUrl: 'https://login.microsoftonline.com',
      oAuthScope: 'https://api.securitycenter.microsoft.com/.default',
      apiUrl: 'https://api.securitycenter.microsoft.com',
    };

    it('validates a valid config', () => {
      expect(() => MicrosoftDefenderEndpointConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('throws when clientId is missing', () => {
      const { clientId, ...rest } = validConfig;
      expect(() => MicrosoftDefenderEndpointConfigSchema.parse(rest)).toThrow();
    });

    it('throws when tenantId is missing', () => {
      const { tenantId, ...rest } = validConfig;
      expect(() => MicrosoftDefenderEndpointConfigSchema.parse(rest)).toThrow();
    });

    it('throws on empty strings', () => {
      expect(() =>
        MicrosoftDefenderEndpointConfigSchema.parse({
          ...validConfig,
          clientId: '',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        MicrosoftDefenderEndpointConfigSchema.parse({
          ...validConfig,
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('MicrosoftDefenderEndpointSecretsSchema', () => {
    it('validates valid secrets', () => {
      expect(() =>
        MicrosoftDefenderEndpointSecretsSchema.parse({
          clientSecret: 'secret-123',
        })
      ).not.toThrow();
    });

    it('throws when clientSecret is missing', () => {
      expect(() => MicrosoftDefenderEndpointSecretsSchema.parse({})).toThrow();
    });

    it('throws on empty clientSecret', () => {
      expect(() =>
        MicrosoftDefenderEndpointSecretsSchema.parse({
          clientSecret: '',
        })
      ).toThrow();
    });
  });

  describe('AgentDetailsParamsSchema', () => {
    it('validates with id', () => {
      expect(() =>
        AgentDetailsParamsSchema.parse({
          id: 'agent-123',
        })
      ).not.toThrow();
    });

    it('throws when id is missing', () => {
      expect(() => AgentDetailsParamsSchema.parse({})).toThrow();
    });

    it('throws on empty id', () => {
      expect(() =>
        AgentDetailsParamsSchema.parse({
          id: '',
        })
      ).toThrow();
    });
  });

  describe('AgentListParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => AgentListParamsSchema.parse({})).not.toThrow();
    });

    it('validates with string filters', () => {
      expect(() =>
        AgentListParamsSchema.parse({
          computerDnsName: 'hostname',
          id: 'machine-123',
          version: '10.0.19041',
        })
      ).not.toThrow();
    });

    it('validates with array filters', () => {
      expect(() =>
        AgentListParamsSchema.parse({
          computerDnsName: ['host1', 'host2'],
          id: ['id1', 'id2'],
        })
      ).not.toThrow();
    });

    it('validates healthStatus enum values', () => {
      const validStatuses = [
        'Active',
        'Inactive',
        'ImpairedCommunication',
        'NoSensorData',
        'NoSensorDataImpairedCommunication',
        'Unknown',
      ];

      validStatuses.forEach((status) => {
        expect(() =>
          AgentListParamsSchema.parse({
            healthStatus: status,
          })
        ).not.toThrow();
      });
    });

    it('validates pagination', () => {
      expect(() =>
        AgentListParamsSchema.parse({
          page: 1,
          pageSize: 100,
        })
      ).not.toThrow();
    });

    it('throws on pageSize exceeding max', () => {
      expect(() =>
        AgentListParamsSchema.parse({
          pageSize: 1001,
        })
      ).toThrow();
    });

    it('coerces page and pageSize to numbers', () => {
      const result = AgentListParamsSchema.parse({
        page: '5',
        pageSize: '50',
      });
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(50);
    });
  });

  describe('IsolateHostParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        IsolateHostParamsSchema.parse({
          id: 'machine-123',
          comment: 'Isolating for investigation',
        })
      ).not.toThrow();
    });

    it('throws when id is missing', () => {
      expect(() =>
        IsolateHostParamsSchema.parse({
          comment: 'Test',
        })
      ).toThrow();
    });

    it('throws when comment is missing', () => {
      expect(() =>
        IsolateHostParamsSchema.parse({
          id: 'machine-123',
        })
      ).toThrow();
    });

    it('throws on empty id or comment', () => {
      expect(() =>
        IsolateHostParamsSchema.parse({
          id: '',
          comment: 'Test',
        })
      ).toThrow();

      expect(() =>
        IsolateHostParamsSchema.parse({
          id: 'machine-123',
          comment: '',
        })
      ).toThrow();
    });
  });

  describe('ReleaseHostParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        ReleaseHostParamsSchema.parse({
          id: 'machine-123',
          comment: 'Releasing from isolation',
        })
      ).not.toThrow();
    });

    it('throws when required fields are missing', () => {
      expect(() => ReleaseHostParamsSchema.parse({})).toThrow();
    });
  });

  describe('RunScriptParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        RunScriptParamsSchema.parse({
          id: 'machine-123',
          parameters: {
            scriptName: 'GetProcesses.ps1',
          },
        })
      ).not.toThrow();
    });

    it('validates with all fields', () => {
      expect(() =>
        RunScriptParamsSchema.parse({
          id: 'machine-123',
          comment: 'Running diagnostic script',
          parameters: {
            scriptName: 'GetProcesses.ps1',
            args: '-Verbose',
          },
        })
      ).not.toThrow();
    });

    it('throws when parameters.scriptName is missing', () => {
      expect(() =>
        RunScriptParamsSchema.parse({
          id: 'machine-123',
          parameters: {},
        })
      ).toThrow();
    });
  });

  describe('CancelParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        CancelParamsSchema.parse({
          comment: 'Cancelling action',
          actionId: 'action-123',
        })
      ).not.toThrow();
    });

    it('throws on empty strings', () => {
      expect(() =>
        CancelParamsSchema.parse({
          comment: '',
          actionId: 'action-123',
        })
      ).toThrow();
    });
  });

  describe('GetActionsParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => GetActionsParamsSchema.parse({})).not.toThrow();
    });

    it('validates with filters', () => {
      expect(() =>
        GetActionsParamsSchema.parse({
          status: 'Pending',
          type: 'Isolate',
          page: 1,
          pageSize: 50,
          sortField: 'creationDateTimeUtc',
          sortDirection: 'desc',
        })
      ).not.toThrow();
    });

    it('validates status enum values', () => {
      const statuses = ['Pending', 'InProgress', 'Succeeded', 'Failed', 'TimeOut', 'Cancelled'];
      statuses.forEach((status) => {
        expect(() =>
          GetActionsParamsSchema.parse({
            status,
          })
        ).not.toThrow();
      });
    });

    it('validates type enum values', () => {
      const types = [
        'RunAntiVirusScan',
        'Offboard',
        'LiveResponse',
        'CollectInvestigationPackage',
        'Isolate',
        'Unisolate',
        'StopAndQuarantineFile',
        'RestrictCodeExecution',
        'UnrestrictCodeExecution',
      ];
      types.forEach((type) => {
        expect(() =>
          GetActionsParamsSchema.parse({
            type,
          })
        ).not.toThrow();
      });
    });
  });

  describe('MicrosoftDefenderEndpointActionParamsSchema', () => {
    it('validates testConnector action', () => {
      expect(() =>
        MicrosoftDefenderEndpointActionParamsSchema.parse({
          subAction: 'testConnector',
          subActionParams: {},
        })
      ).not.toThrow();
    });

    it('validates isolateHost action', () => {
      expect(() =>
        MicrosoftDefenderEndpointActionParamsSchema.parse({
          subAction: 'isolateHost',
          subActionParams: {
            id: 'machine-123',
            comment: 'Test',
          },
        })
      ).not.toThrow();
    });

    it('validates releaseHost action', () => {
      expect(() =>
        MicrosoftDefenderEndpointActionParamsSchema.parse({
          subAction: 'releaseHost',
          subActionParams: {
            id: 'machine-123',
            comment: 'Test',
          },
        })
      ).not.toThrow();
    });

    it('validates runScript action', () => {
      expect(() =>
        MicrosoftDefenderEndpointActionParamsSchema.parse({
          subAction: 'runScript',
          subActionParams: {
            id: 'machine-123',
            parameters: { scriptName: 'test.ps1' },
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        MicrosoftDefenderEndpointActionParamsSchema.parse({
          subAction: 'invalidAction',
          subActionParams: {},
        })
      ).toThrow();
    });
  });
});
