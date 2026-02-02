/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';

import type {
  MicrosoftDefenderEndpointSecretsSchema,
  MicrosoftDefenderEndpointConfigSchema,
  MicrosoftDefenderEndpointActionParamsSchema,
  IsolateHostParamsSchema,
  ReleaseHostParamsSchema,
  TestConnectorParamsSchema,
  AgentDetailsParamsSchema,
  GetActionsParamsSchema,
  AgentListParamsSchema,
  GetLibraryFilesResponse,
  RunScriptParamsSchema,
  CancelParamsSchema,
} from '../schemas/v1';

export type MicrosoftDefenderEndpointConfig = z.infer<typeof MicrosoftDefenderEndpointConfigSchema>;

export type MicrosoftDefenderEndpointSecrets = z.infer<
  typeof MicrosoftDefenderEndpointSecretsSchema
>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MicrosoftDefenderEndpointBaseApiResponse {}
// cannot directly infer type due to https://github.com/colinhacks/zod/issues/2938
// export type MicrosoftDefenderEndpointBaseApiResponse = z.infer<
//   typeof MicrosoftDefenderEndpointBaseApiResponseSchema
// >;

export interface MicrosoftDefenderEndpointTestConnector {
  results: string[];
}

export type MicrosoftDefenderEndpointAgentDetailsParams = z.infer<typeof AgentDetailsParamsSchema>;

export type MicrosoftDefenderEndpointAgentListParams = z.infer<typeof AgentListParamsSchema>;

export interface MicrosoftDefenderEndpointAgentListResponse {
  '@odata.context': string;
  '@odata.count'?: number;
  /** If value is `-1`, then API did not provide a total count */
  total: number;
  page: number;
  pageSize: number;
  value: MicrosoftDefenderEndpointMachine[];
}

export type MicrosoftDefenderEndpointGetActionsParams = z.infer<typeof GetActionsParamsSchema>;

export interface MicrosoftDefenderEndpointGetActionsResponse {
  '@odata.context': string;
  '@odata.count'?: number;
  /** If value is `-1`, then API did not provide a total count */
  total: number;
  page: number;
  pageSize: number;
  value: MicrosoftDefenderEndpointMachineAction[];
}

export interface MicrosoftDefenderEndpointGetActionResultsResponse {
  '@odata.context': string;
  value: string; // Downloadable link
}

/**
 * @see https://learn.microsoft.com/en-us/defender-endpoint/api/machine
 */
export interface MicrosoftDefenderEndpointMachine {
  /** machine identity. */
  id: string;
  /** machine fully qualified name. */
  computerDnsName: string;
  /** First date and time where the machine was observed by Microsoft Defender for Endpoint. */
  firstSeen: string;
  /** Time and date of the last received full device report. A device typically sends a full report every 24 hours.  NOTE: This property doesn't correspond to the last seen value in the UI. It pertains to the last device update. */
  lastSeen: string;
  /** Operating system platform. */
  osPlatform: string;
  /** Status of machine onboarding. Possible values are: onboarded, CanBeOnboarded, Unsupported, and InsufficientInfo. */
  onboardingstatus: string;
  /** Operating system processor. Use osArchitecture property instead. */
  osProcessor: string;
  /** Operating system Version. */
  version: string;
  /** Operating system build number. */
  osBuild?: number;
  /** Last IP on local NIC on the machine. */
  lastIpAddress: string;
  /** Last IP through which the machine accessed the internet. */
  lastExternalIpAddress: string;
  /** machine health status. Possible values are: Active, Inactive, ImpairedCommunication, NoSensorData, NoSensorDataImpairedCommunication, and Unknown. */
  healthStatus:
    | 'Active'
    | 'Inactive'
    | 'ImpairedCommunication'
    | 'NoSensorData'
    | 'NoSensorDataImpairedCommunication'
    | 'Unknown';
  /** Machine group Name. */
  rbacGroupName: string;
  /** Machine group ID. */
  rbacGroupId: string;
  /** Risk score as evaluated by Microsoft Defender for Endpoint. Possible values are: None, Informational, Low, Medium, and High. */
  riskScore?: 'None' | 'Informational' | 'Low' | 'Medium' | 'High';
  /** Microsoft Entra Device ID (when machine is Microsoft Entra joined). */
  aadDeviceId?: string;
  /** Set of machine tags. */
  machineTags: string[];
  /** Exposure level as evaluated by Microsoft Defender for Endpoint. Possible values are: None, Low, Medium, and High. */
  exposureLevel?: 'None' | 'Low' | 'Medium' | 'High';
  /** The value of the device. Possible values are: Normal, Low, and High. */
  deviceValue?: 'Normal' | 'Low' | 'High';
  /** Set of IpAddress objects. See Get machines API. */
  ipAddresses: Array<{
    ipAddress: string;
    macAddress: string;
    type: string;
    operationalStatus: string;
  }>;
  /** Operating system architecture. Possible values are: 32-bit, 64-bit. Use this property instead of osProcessor. */
  osArchitecture: string;
}

/**
 * @see https://learn.microsoft.com/en-us/defender-endpoint/api/machineaction
 */
export interface MicrosoftDefenderEndpointMachineAction {
  /** Identity of the Machine Action entity. */
  id: string;
  /** Type of the action. Possible values are: RunAntiVirusScan, Offboard, LiveResponse, CollectInvestigationPackage, Isolate, Unisolate, StopAndQuarantineFile, RestrictCodeExecution, and UnrestrictCodeExecution. */
  type:
    | 'RunAntiVirusScan'
    | 'Offboard'
    | 'LiveResponse'
    | 'CollectInvestigationPackage'
    | 'Isolate'
    | 'Unisolate'
    | 'StopAndQuarantineFile'
    | 'RestrictCodeExecution'
    | 'UnrestrictCodeExecution';
  /** Scope of the action. Full or Selective for Isolation, Quick or Full for antivirus scan. */
  scope?: string;
  /** Identity of the person that executed the action. */
  requestor: string;
  /** Id the customer can submit in the request for custom correlation. */
  externalID?: string;
  /** The name of the user/application that submitted the action. */
  requestSource: string;
  /** Array of command execution details for this action. */
  commands: MicrosoftDefenderCommandEntry[];
  /** Identity of the person that canceled the action. */
  cancellationRequestor: string;
  /** Comment that was written when issuing the action. */
  requestorComment: string;
  /** Comment that was written when canceling the action. */
  cancellationComment: string;
  /** Current status of the command. Possible values are: Pending, InProgress, Succeeded, Failed, TimeOut, and Cancelled. */
  status: 'Pending' | 'InProgress' | 'Succeeded' | 'Failed' | 'TimeOut' | 'Cancelled';
  /** ID of the machine on which the action was executed. */
  machineId: string;
  /** Name of the machine on which the action was executed. */
  computerDnsName: string;
  /** The date and time when the action was created. */
  creationDateTimeUtc: string;
  /** The date and time when the action was canceled. */
  cancellationDateTimeUtc: string;
  /** The last date and time when the action status was updated. */
  lastUpdateDateTimeUtc: string;
  /** Machine action title. */
  title: string;
  /** Contains two Properties. string fileIdentifier, Enum fileIdentifierType with the possible values: Sha1, Sha256, and Md5. */
  relatedFileInfo?: { fileIdentifier: string; fileIdentifierType: 'Sha1' | 'Sha256' | 'Md5' };
  errorResult?: number;
  troubleshootInfo?: string;
}

export type MicrosoftDefenderEndpointTestConnectorParams = z.infer<
  typeof TestConnectorParamsSchema
>;

export type MicrosoftDefenderEndpointIsolateHostParams = z.infer<typeof IsolateHostParamsSchema>;

export type MicrosoftDefenderEndpointReleaseHostParams = z.infer<typeof ReleaseHostParamsSchema>;
export type MicrosoftDefenderEndpointRunScriptParams = z.infer<typeof RunScriptParamsSchema>;
export type MicrosoftDefenderEndpointCancelParams = z.infer<typeof CancelParamsSchema>;

export type MicrosoftDefenderEndpointActionParams = z.infer<
  typeof MicrosoftDefenderEndpointActionParamsSchema
>;

export interface MicrosoftDefenderEndpointApiTokenResponse {
  token_type: 'bearer';
  /** The amount of time that an access token is valid (in seconds NOT milliseconds). */
  expires_in: number;
  access_token: string;
}

export type MicrosoftDefenderGetLibraryFilesResponse = z.infer<typeof GetLibraryFilesResponse>;

/**
 * Represents a single command execution entry as returned by Microsoft Defender API.
 */
export interface MicrosoftDefenderCommandEntry {
  /** The index of the command in the sequence. */
  index: number;
  /** The UTC start time (ISO string) of the command execution. */
  startTime: string;
  /** The UTC end time (ISO string) of the command execution. */
  endTime: string;
  /** Status of the command execution. */
  commandStatus: string;
  /** Array of error messages (if any) for the command execution. */
  errors: string[];
  /** The command details (type and params). */
  command: {
    type: 'PutFile' | 'RunScript' | 'GetFile';
    params: Array<{ key: string; value: string }>;
  };
}
