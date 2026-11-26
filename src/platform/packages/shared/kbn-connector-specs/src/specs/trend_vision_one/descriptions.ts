/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const TASK =
  'Returns outcome (requested, or skipped when the same task already runs) and taskId for getResponseTaskStatus; an unknown target fails.';
const ENDPOINT = 'Give exactly one of agentGuid or endpointName.';
const OBJECT = 'type is url, domain, ip, fileSha1, fileSha256 or senderMailAddress.';

export const ACTION_DESCRIPTIONS = {
  listAlerts:
    'List Workbench alerts in a time window, newest first, filtered by status, investigationResult or severity. Returns one page of up to 10 alerts with totalCount and nextLink; pass nextLink to read the next page.',
  getAlertDetails:
    'Get one Workbench alert: status, investigationResult, severity, score, impactScope, indicators, matchedRules and its etag.',
  updateAlertStatus:
    'Set a Workbench alert status and/or investigationResult. Triage words: new = Open; in progress = In Progress; true positive = Closed + True Positive; false positive = Closed + False Positive; closed = Closed + Other Findings. Fails if the alert changed since the etag was read.',
  addAlertNote: 'Add a note to a Workbench alert. Returns the new noteId.',
  listObservedAttackTechniques:
    'List Observed Attack Techniques detections by detection or ingestion time (last 365 days), with an optional filter. A time range needs both its start and end; without one, only the last hour of detections. An ingestion range alone still returns only the last hour of detections; give a detection range to read more. Returns one page and nextLink.',
  listEndpoints:
    'List managed endpoints (agentGuid, endpointName, OS, IP addresses, isolationStatus, agent and sensor state). Returns one page and nextLink.',
  isolateEndpoint: `Isolate an endpoint from the network; it still reaches the management server. ${ENDPOINT} ${TASK}`,
  restoreEndpointConnection: `Restore the network connection of an isolated endpoint. ${ENDPOINT} ${TASK}`,
  terminateProcess: `Terminate a running process on a Windows endpoint by processId and its fileName or fileSha1 (give at least one). Irreversible. ${ENDPOINT} ${TASK}`,
  collectForensicFile: `Collect a file from an endpoint into a password-protected archive in the product. ${ENDPOINT} ${TASK}`,
  getResponseTaskStatus:
    'Get a response task by taskId: status queued, running or pendingApproval (not finished) or succeeded, failed, canceled or rejected, with action, target and error. A file collection task also reports the file hashes, size and expiry.',
  quarantineEmailMessage: `Move an email message to the mailbox quarantine folder. Give messageId (optionally with mailBox) or uniqueId. ${TASK}`,
  deleteEmailMessage: `Delete an email message; it cannot be recovered. Give messageId (optionally with mailBox) or uniqueId. ${TASK}`,
  disableUserAccount: `Disable a user account in Active Directory or Microsoft Entra ID. ${TASK}`,
  enableUserAccount: `Enable a disabled user account in Active Directory or Microsoft Entra ID. ${TASK}`,
  forceUserSignOut: `Sign a user out of all active Microsoft Entra ID sessions. ${TASK}`,
  addToSuspiciousObjectList: `Add an object to the suspicious object list so connected products block or log it; adding an object that is already on the list updates its entry, and when the list of that type is full the product deletes the objects closest to expiry. ${OBJECT} Returns outcome added.`,
  removeFromSuspiciousObjectList: `Remove an object from the suspicious object list. ${OBJECT} Returns outcome removed or notFound.`,
  addToExceptionList: `Add an object to the exception list so it is never flagged; this weakens detection. ${OBJECT} Returns outcome added.`,
  submitFileToSandbox:
    'Submit one base64 file to the sandbox (uses the daily quota). Returns the submission id for getSandboxAnalysisResult, digest and remaining quota.',
  submitUrlsToSandbox:
    'Submit 1 to 10 URLs to the sandbox (uses the daily quota). Returns one item per URL with status and body.id for getSandboxAnalysisResult, and the quota.',
  getSandboxAnalysisResult:
    'Get a sandbox verdict by submission id: riskLevel (high, medium, low, noRisk), detectionNames, threatTypes and trueFileType. Not found means the analysis is still running or the id is unknown.',
} as const;
