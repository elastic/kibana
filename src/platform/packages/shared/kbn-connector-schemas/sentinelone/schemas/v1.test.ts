/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SentinelOneConfigSchema,
  SentinelOneSecretsSchema,
  SentinelOneGetRemoteScriptsParamsSchema,
  SentinelOneFetchAgentFilesParamsSchema,
  SentinelOneDownloadAgentFileParamsSchema,
  SentinelOneGetActivitiesParamsSchema,
  SentinelOneExecuteScriptParamsSchema,
  SentinelOneGetRemoteScriptResultsParamsSchema,
  SentinelOneDownloadRemoteScriptResultsParamsSchema,
  SentinelOneGetRemoteScriptStatusParamsSchema,
  SentinelOneIsolateHostParamsSchema,
  SentinelOneActionParamsSchema,
} from './v1';

describe('SentinelOne Schema', () => {
  describe('SentinelOneConfigSchema', () => {
    it('validates a valid config', () => {
      expect(() =>
        SentinelOneConfigSchema.parse({
          url: 'https://api.sentinelone.com',
        })
      ).not.toThrow();
    });

    it('throws when url is missing', () => {
      expect(() => SentinelOneConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SentinelOneConfigSchema.parse({
          url: 'https://api.sentinelone.com',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('SentinelOneSecretsSchema', () => {
    it('validates valid secrets', () => {
      expect(() =>
        SentinelOneSecretsSchema.parse({
          token: 'api-token-123',
        })
      ).not.toThrow();
    });

    it('throws when token is missing', () => {
      expect(() => SentinelOneSecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SentinelOneSecretsSchema.parse({
          token: 'api-token',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('SentinelOneGetRemoteScriptsParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => SentinelOneGetRemoteScriptsParamsSchema.parse({})).not.toThrow();
    });

    it('validates with filters', () => {
      expect(() =>
        SentinelOneGetRemoteScriptsParamsSchema.parse({
          query: 'script-name',
          osTypes: 'windows,linux',
          scriptType: 'action',
          limit: 50,
        })
      ).not.toThrow();
    });

    it('applies default limit', () => {
      const result = SentinelOneGetRemoteScriptsParamsSchema.parse({});
      expect(result.limit).toBeNull();
    });

    it('validates limit range', () => {
      expect(() =>
        SentinelOneGetRemoteScriptsParamsSchema.parse({
          limit: 1,
        })
      ).not.toThrow();

      expect(() =>
        SentinelOneGetRemoteScriptsParamsSchema.parse({
          limit: 1000,
        })
      ).not.toThrow();
    });

    it('throws on limit exceeding max', () => {
      expect(() =>
        SentinelOneGetRemoteScriptsParamsSchema.parse({
          limit: 1001,
        })
      ).toThrow();
    });

    it('throws on limit below min', () => {
      expect(() =>
        SentinelOneGetRemoteScriptsParamsSchema.parse({
          limit: 0,
        })
      ).toThrow();
    });

    it('coerces limit to number', () => {
      const result = SentinelOneGetRemoteScriptsParamsSchema.parse({
        limit: '50',
      });
      expect(result.limit).toBe(50);
    });
  });

  describe('SentinelOneFetchAgentFilesParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        SentinelOneFetchAgentFilesParamsSchema.parse({
          agentId: 'agent-123',
          zipPassCode: 'passwordMin10',
          files: ['/path/to/file.txt'],
        })
      ).not.toThrow();
    });

    it('throws when agentId is missing', () => {
      expect(() =>
        SentinelOneFetchAgentFilesParamsSchema.parse({
          zipPassCode: 'passwordMin10',
          files: ['/path/to/file.txt'],
        })
      ).toThrow();
    });

    it('throws on empty agentId', () => {
      expect(() =>
        SentinelOneFetchAgentFilesParamsSchema.parse({
          agentId: '',
          zipPassCode: 'passwordMin10',
          files: ['/path/to/file.txt'],
        })
      ).toThrow();
    });

    it('throws when zipPassCode is too short', () => {
      expect(() =>
        SentinelOneFetchAgentFilesParamsSchema.parse({
          agentId: 'agent-123',
          zipPassCode: 'short',
          files: ['/path/to/file.txt'],
        })
      ).toThrow();
    });

    it('throws when files array contains empty string', () => {
      expect(() =>
        SentinelOneFetchAgentFilesParamsSchema.parse({
          agentId: 'agent-123',
          zipPassCode: 'passwordMin10',
          files: [''],
        })
      ).toThrow();
    });
  });

  describe('SentinelOneDownloadAgentFileParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        SentinelOneDownloadAgentFileParamsSchema.parse({
          agentId: 'agent-123',
          activityId: 'activity-456',
        })
      ).not.toThrow();
    });

    it('throws on empty agentId', () => {
      expect(() =>
        SentinelOneDownloadAgentFileParamsSchema.parse({
          agentId: '',
          activityId: 'activity-456',
        })
      ).toThrow();
    });

    it('throws on empty activityId', () => {
      expect(() =>
        SentinelOneDownloadAgentFileParamsSchema.parse({
          agentId: 'agent-123',
          activityId: '',
        })
      ).toThrow();
    });
  });

  describe('SentinelOneGetActivitiesParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => SentinelOneGetActivitiesParamsSchema.parse({})).not.toThrow();
    });

    it('validates undefined', () => {
      expect(() => SentinelOneGetActivitiesParamsSchema.parse(undefined)).not.toThrow();
    });

    it('validates with filters', () => {
      expect(() =>
        SentinelOneGetActivitiesParamsSchema.parse({
          accountIds: 'account-123',
          activityTypes: '1,2,3',
          agentIds: 'agent-123,agent-456',
          limit: 100,
        })
      ).not.toThrow();
    });

    it('coerces limit to number', () => {
      const result = SentinelOneGetActivitiesParamsSchema.parse({
        limit: '50',
      });
      expect(result?.limit).toBe(50);
    });
  });

  describe('SentinelOneExecuteScriptParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        SentinelOneExecuteScriptParamsSchema.parse({
          filter: {
            ids: 'agent-123',
          },
          script: {
            scriptId: 'script-456',
          },
        })
      ).not.toThrow();
    });

    it('validates with all script options', () => {
      expect(() =>
        SentinelOneExecuteScriptParamsSchema.parse({
          filter: {
            uuids: 'uuid-123',
          },
          script: {
            scriptId: 'script-456',
            apiKey: 'api-key',
            inputParams: '-Verbose',
            outputDirectory: '/output',
            outputDestination: 'SentinelCloud',
            password: 'password123',
            requiresApproval: true,
            scriptName: 'test-script',
            scriptRuntimeTimeoutSeconds: 300,
            taskDescription: 'Test task',
          },
          alertIds: ['alert-1', 'alert-2'],
        })
      ).not.toThrow();
    });

    it('validates outputDestination enum values', () => {
      const destinations = ['Local', 'None', 'SentinelCloud', 'SingularityXDR'];
      destinations.forEach((dest) => {
        expect(() =>
          SentinelOneExecuteScriptParamsSchema.parse({
            filter: { ids: 'agent-123' },
            script: {
              scriptId: 'script-456',
              outputDestination: dest,
            },
          })
        ).not.toThrow();
      });
    });

    it('throws on invalid outputDestination', () => {
      expect(() =>
        SentinelOneExecuteScriptParamsSchema.parse({
          filter: { ids: 'agent-123' },
          script: {
            scriptId: 'script-456',
            outputDestination: 'Invalid',
          },
        })
      ).toThrow();
    });

    it('coerces scriptRuntimeTimeoutSeconds to number', () => {
      const result = SentinelOneExecuteScriptParamsSchema.parse({
        filter: { ids: 'agent-123' },
        script: {
          scriptId: 'script-456',
          scriptRuntimeTimeoutSeconds: '300',
        },
      });
      expect(result.script.scriptRuntimeTimeoutSeconds).toBe(300);
    });
  });

  describe('SentinelOneGetRemoteScriptResultsParamsSchema', () => {
    it('validates with taskIds', () => {
      expect(() =>
        SentinelOneGetRemoteScriptResultsParamsSchema.parse({
          taskIds: ['task-1', 'task-2'],
        })
      ).not.toThrow();
    });

    it('throws when taskIds is missing', () => {
      expect(() => SentinelOneGetRemoteScriptResultsParamsSchema.parse({})).toThrow();
    });
  });

  describe('SentinelOneDownloadRemoteScriptResultsParamsSchema', () => {
    it('validates with taskId', () => {
      expect(() =>
        SentinelOneDownloadRemoteScriptResultsParamsSchema.parse({
          taskId: 'task-123',
        })
      ).not.toThrow();
    });

    it('throws on empty taskId', () => {
      expect(() =>
        SentinelOneDownloadRemoteScriptResultsParamsSchema.parse({
          taskId: '',
        })
      ).toThrow();
    });
  });

  describe('SentinelOneGetRemoteScriptStatusParamsSchema', () => {
    it('validates with parentTaskId', () => {
      expect(() =>
        SentinelOneGetRemoteScriptStatusParamsSchema.parse({
          parentTaskId: 'parent-task-123',
        })
      ).not.toThrow();
    });

    it('throws when parentTaskId is missing', () => {
      expect(() => SentinelOneGetRemoteScriptStatusParamsSchema.parse({})).toThrow();
    });
  });

  describe('SentinelOneIsolateHostParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => SentinelOneIsolateHostParamsSchema.parse({})).not.toThrow();
    });

    it('validates with filters', () => {
      expect(() =>
        SentinelOneIsolateHostParamsSchema.parse({
          ids: 'agent-123',
          siteIds: 'site-456',
          groupIds: 'group-789',
        })
      ).not.toThrow();
    });
  });

  describe('SentinelOneActionParamsSchema', () => {
    it('validates isolateHost action', () => {
      expect(() =>
        SentinelOneActionParamsSchema.parse({
          subAction: 'isolateHost',
          subActionParams: {
            ids: 'agent-123',
          },
        })
      ).not.toThrow();
    });

    it('validates releaseHost action', () => {
      expect(() =>
        SentinelOneActionParamsSchema.parse({
          subAction: 'releaseHost',
          subActionParams: {},
        })
      ).not.toThrow();
    });

    it('validates executeScript action', () => {
      expect(() =>
        SentinelOneActionParamsSchema.parse({
          subAction: 'executeScript',
          subActionParams: {
            filter: { ids: 'agent-123' },
            script: { scriptId: 'script-456' },
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        SentinelOneActionParamsSchema.parse({
          subAction: 'invalidAction',
          subActionParams: {},
        })
      ).toThrow();
    });
  });
});
