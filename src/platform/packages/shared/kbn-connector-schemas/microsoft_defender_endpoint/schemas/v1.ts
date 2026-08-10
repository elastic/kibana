/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { SUB_ACTION } from '../constants';

// ----------------------------------
// Connector setup schemas
// ----------------------------------
export const MicrosoftDefenderEndpointConfigSchema = lazySchema(() =>
  z
    .object({
      clientId: z.string().min(1),
      tenantId: z.string().min(1),
      oAuthServerUrl: z.string().min(1),
      oAuthScope: z.string().min(1),
      apiUrl: z.string().min(1),
    })
    .strict()
);
export const MicrosoftDefenderEndpointSecretsSchema = lazySchema(() =>
  z
    .object({
      clientSecret: z.string().min(1),
    })
    .strict()
);

// ----------------------------------
// Connector Methods
// ----------------------------------
export const MicrosoftDefenderEndpointDoNotValidateResponseSchema = lazySchema(() => z.any());

export const MicrosoftDefenderEndpointBaseApiResponseSchema = lazySchema(() =>
  z.object({}).passthrough().optional()
);

export const MicrosoftDefenderEndpointEmptyParamsSchema = lazySchema(() => z.object({}).strict());

export const TestConnectorParamsSchema = lazySchema(() => z.object({}).strict());

export const AgentDetailsParamsSchema = lazySchema(() =>
  z
    .object({
      id: z.string().min(1),
    })
    .strict()
);

const MachineHealthStatusSchema = lazySchema(() =>
  z.enum([
    'Active',
    'Inactive',
    'ImpairedCommunication',
    'NoSensorData',
    'NoSensorDataImpairedCommunication',
    'Unknown',
  ])
);

export const AgentListParamsSchema = lazySchema(() =>
  z
    .object({
      computerDnsName: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      id: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      version: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      deviceValue: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      aaDeviceId: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      machineTags: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      lastSeen: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      exposureLevel: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      onboardingStatus: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      lastIpAddress: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      healthStatus: z
        .union([MachineHealthStatusSchema, z.array(MachineHealthStatusSchema).min(1)])
        .optional(),
      osPlatform: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      riskScore: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      rbacGroupId: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      page: z.coerce.number().min(1).optional(),
      pageSize: z.coerce.number().min(1).max(1000).optional(),
    })
    .strict()
);

export const IsolateHostParamsSchema = lazySchema(() =>
  z
    .object({
      id: z.string().min(1),
      comment: z.string().min(1),
    })
    .strict()
);

export const ReleaseHostParamsSchema = lazySchema(() =>
  z
    .object({
      id: z.string().min(1),
      comment: z.string().min(1),
    })
    .strict()
);

export const RunScriptParamsSchema = lazySchema(() =>
  z
    .object({
      id: z.string().min(1),
      comment: z.string().min(1).optional(),
      parameters: z
        .object({
          scriptName: z.string().min(1),
          args: z.string().min(1).optional(),
        })
        .strict(),
    })
    .strict()
);

export const CancelParamsSchema = lazySchema(() =>
  z
    .object({
      comment: z.string().min(1),
      actionId: z.string().min(1),
    })
    .strict()
);

const MachineActionTypeSchema = lazySchema(() =>
  z.enum([
    'RunAntiVirusScan',
    'Offboard',
    'LiveResponse',
    'CollectInvestigationPackage',
    'Isolate',
    'Unisolate',
    'StopAndQuarantineFile',
    'RestrictCodeExecution',
    'UnrestrictCodeExecution',
  ])
);

const MachineActionStatusSchema = lazySchema(() =>
  z.enum(['Pending', 'InProgress', 'Succeeded', 'Failed', 'TimeOut', 'Cancelled'])
);

export const GetActionsParamsSchema = lazySchema(() =>
  z
    .object({
      id: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      status: z
        .union([MachineActionStatusSchema, z.array(MachineActionStatusSchema).min(1)])
        .optional(),
      machineId: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      type: z.union([MachineActionTypeSchema, z.array(MachineActionTypeSchema).min(1)]).optional(),
      requestor: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
      creationDateTimeUtc: z
        .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
        .optional(),
      page: z.coerce.number().min(1).optional(),
      pageSize: z.coerce.number().min(1).max(1000).optional(),
      sortField: z.string().min(1).optional(),
      sortDirection: z.enum(['asc', 'desc']).optional(),
    })
    .strict()
);

export const GetActionResultsParamsSchema = lazySchema(() =>
  z
    .object({
      id: z.string().min(1),
    })
    .strict()
);

export const MSDefenderLibraryFileSchema = lazySchema(() =>
  z
    .object({
      fileName: z.string().optional(),
      sha256: z.string().optional(),
      description: z.string().optional(),
      creationTime: z.string().optional(),
      lastUpdatedTime: z.string().optional(),
      createdBy: z.string().optional(),
      hasParameters: z.boolean().optional(),
      parametersDescription: z.string().nullish(),
    })
    .passthrough()
);

export const GetLibraryFilesResponse = lazySchema(() =>
  z
    .object({
      '@odata.context': z.string().optional(),
      value: z.array(MSDefenderLibraryFileSchema).optional(),
    })
    .passthrough()
);

export const DownloadActionResultsResponseSchema = lazySchema(() => z.any());

// ----------------------------------
// Connector Sub-Actions
// ----------------------------------

const TestConnectorSchema = lazySchema(() =>
  z
    .object({
      subAction: z.literal(SUB_ACTION.TEST_CONNECTOR),
      subActionParams: TestConnectorParamsSchema,
    })
    .strict()
);

const IsolateHostSchema = lazySchema(() =>
  z
    .object({
      subAction: z.literal(SUB_ACTION.ISOLATE_HOST),
      subActionParams: IsolateHostParamsSchema,
    })
    .strict()
);

const ReleaseHostSchema = lazySchema(() =>
  z
    .object({
      subAction: z.literal(SUB_ACTION.RELEASE_HOST),
      subActionParams: ReleaseHostParamsSchema,
    })
    .strict()
);
const RunScriptSchema = lazySchema(() =>
  z
    .object({
      subAction: z.literal(SUB_ACTION.RUN_SCRIPT),
      subActionParams: RunScriptParamsSchema,
    })
    .strict()
);

export const MicrosoftDefenderEndpointActionParamsSchema = lazySchema(() =>
  z.union([TestConnectorSchema, IsolateHostSchema, ReleaseHostSchema, RunScriptSchema])
);
