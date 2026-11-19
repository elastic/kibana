/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';
import {
  isResourceNotFound,
  mdeList,
  mdeRequest,
  toBareUserName,
  valueOf,
  withoutODataContext,
} from './client';
import type { MdeRequestOptions } from './client';
import { mdeAuth, MdeConfigSchema } from './auth';
import { machineActions } from './machines';
import {
  BatchDeleteIndicatorsInputSchema,
  BatchSubmitIndicatorsInputSchema,
  DeleteIndicatorInputSchema,
  DomainInputSchema,
  DomainStatsInputSchema,
  FileInputSchema,
  FileMachinesInputSchema,
  FileStatsInputSchema,
  IpStatsInputSchema,
  ListInputSchema,
  ListVulnerabilitiesInputSchema,
  SubmitIndicatorInputSchema,
  UserInputSchema,
} from './types';
import type {
  BatchDeleteIndicatorsInput,
  BatchSubmitIndicatorsInput,
  DeleteIndicatorInput,
  DomainInput,
  DomainStatsInput,
  FileInput,
  FileMachinesInput,
  FileStatsInput,
  IpStatsInput,
  ListInput,
  ListVulnerabilitiesInput,
  SubmitIndicatorInput,
  UserInput,
} from './types';

const get = (
  path: string,
  permission: string,
  params?: MdeRequestOptions['params']
): MdeRequestOptions => ({ method: 'GET', path, permission, params });

const statsParams = (lookBackHours?: number) =>
  lookBackHours === undefined ? undefined : { lookBackHours };

const definedFields = (fields: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

export const MicrosoftDefenderForEndpoint: ConnectorSpec = {
  metadata: {
    id: '.microsoftDefenderEndpointv2',
    displayName: 'Microsoft Defender for Endpoint',
    description: i18n.translate(
      'connectorSpecs.microsoftDefenderForEndpoint.metadata.description',
      {
        defaultMessage:
          'Contain and investigate devices in Microsoft Defender for Endpoint — list, isolate, and release devices, run live response scripts and antivirus scans, and manage block and allow indicators',
      }
    ),
    // New third party connectors default to an enterprise license by policy. The floor
    // the actions plugin enforces is gold; raise this only, never lower it below gold.
    // The id-derived slug (microsoft-defender-endpointv2) is not the docs page name.
    docsUrl:
      'https://www.elastic.co/docs/reference/kibana/connectors-kibana/microsoft-defender-for-endpoint-action-type',
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type ships for Agent Builder only, so that no node runs a workflow step for
    // a type it does not have yet. 'workflows' is added in a follow-up once the type is everywhere.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: mdeAuth,

  schema: MdeConfigSchema,

  validateUrls: { fields: ['apiUrl'] },

  actions: {
    ...machineActions,

    // Files, IP addresses, domains, and users
    getFileInfo: {
      isTool: true,
      scope: 'read',
      description:
        'Get what Defender knows about a file by SHA-1 or SHA-256: sha1, sha256, md5, size, fileType, isPeFile, signer, issuer, isValidCertificate, filePublisher, fileProductName, determinationType, and globalPrevalence.',
      input: FileInputSchema,
      handler: async (ctx, input: FileInput) =>
        withoutODataContext(
          await mdeRequest(ctx, get(`/files/${encodeURIComponent(input.hash)}`, 'File.Read.All'))
        ),
    },

    getFilePrevalence: {
      isTool: true,
      scope: 'read',
      description:
        'Get prevalence statistics for a file by SHA-1 or SHA-256, to score it before blocking: sha1, organizationPrevalence, orgFirstSeen, orgLastSeen, globallyPrevalence, globalFirstObserved, globalLastObserved, and topFileNames. An unknown file returns 404.',
      input: FileStatsInputSchema,
      handler: async (ctx, input: FileStatsInput) =>
        withoutODataContext(
          await mdeRequest(
            ctx,
            get(
              `/files/${encodeURIComponent(input.hash)}/stats`,
              'File.Read.All',
              statsParams(input.lookBackHours)
            )
          )
        ),
    },

    getFileDevices: {
      isTool: true,
      scope: 'read',
      description:
        'List the devices where a file (by SHA-1 only) was seen, to scope an incident before isolating or scanning them. An unknown file returns an empty list, not 404. Returns value (device entities) and count.',
      input: FileMachinesInputSchema,
      handler: async (ctx, input: FileMachinesInput) =>
        valueOf(
          await mdeRequest(
            ctx,
            get(`/files/${encodeURIComponent(input.sha1)}/machines`, 'Machine.ReadWrite.All')
          )
        ),
    },

    getIpPrevalence: {
      isTool: true,
      scope: 'read',
      description:
        'Get prevalence statistics for an IPv4 address in the organization (the API does not accept IPv6), to score it before blocking: ipAddress, organizationPrevalence (devices that opened a connection to it), orgFirstSeen, and orgLastSeen. An IP never seen returns 200 with organizationPrevalence 0 and no first/last seen, not 404.',
      input: IpStatsInputSchema,
      handler: async (ctx, input: IpStatsInput) =>
        withoutODataContext(
          await mdeRequest(
            ctx,
            get(
              `/ips/${encodeURIComponent(input.ip)}/stats`,
              'Ip.Read.All',
              statsParams(input.lookBackHours)
            )
          )
        ),
    },

    getDomainPrevalence: {
      isTool: true,
      scope: 'read',
      description:
        'Get prevalence statistics for a domain in the organization, to score it before blocking: host, organizationPrevalence (devices that communicated with it), orgFirstSeen, and orgLastSeen. A domain never seen returns 200 with organizationPrevalence 0 and no first/last seen, not 404.',
      input: DomainStatsInputSchema,
      handler: async (ctx, input: DomainStatsInput) =>
        withoutODataContext(
          await mdeRequest(
            ctx,
            get(
              `/domains/${encodeURIComponent(input.domain)}/stats`,
              'URL.Read.All',
              statsParams(input.lookBackHours)
            )
          )
        ),
    },

    getDomainDevices: {
      isTool: true,
      scope: 'read',
      description:
        'List the devices that communicated with a domain (at most 500), to scope an incident. Returns value (device entities) and count.',
      input: DomainInputSchema,
      handler: async (ctx, input: DomainInput) =>
        valueOf(
          await mdeRequest(
            ctx,
            get(`/domains/${encodeURIComponent(input.domain)}/machines`, 'Machine.ReadWrite.All')
          )
        ),
    },

    getUserDevices: {
      isTool: true,
      scope: 'read',
      description:
        'List the devices a user account logged on to, to scope an incident. Pass the user name, UPN, or DOMAIN\\user; the connector sends the bare account name. Returns value (device entities) and count; an unknown user returns an empty list, not 404.',
      input: UserInputSchema,
      handler: async (ctx, input: UserInput) =>
        valueOf(
          await mdeRequest(
            ctx,
            get(
              `/users/${encodeURIComponent(toBareUserName(input.user))}/machines`,
              'Machine.ReadWrite.All'
            )
          )
        ),
    },

    // Vulnerabilities
    listVulnerabilities: {
      isTool: true,
      scope: 'read',
      description:
        'List vulnerabilities (CVEs) known to Defender Vulnerability Management: id, name, description, severity, cvssV3, exposedMachines, publishedOn, updatedOn, publicExploit, and exploitVerified. Without softwareId: one page at a time, with an optional OData filter on id, name, description, cvssV3, publishedOn, severity, or updatedOn, e.g. "severity eq \'Critical\'"; returns value, count, hasMore, and nextSkip. With softwareId: the vulnerabilities of that software, one page at a time (no filter); returns value, count, hasMore, and nextSkip.',
      input: ListVulnerabilitiesInputSchema,
      // Paged in both forms: one response for a large software (Windows has thousands of CVEs)
      // exceeds the actions framework's response size limit. Sorted by id: without $orderby the
      // API returns rows in a different order on each call, so skip-based pages overlap.
      handler: async (ctx, { softwareId, ...input }: ListVulnerabilitiesInput) =>
        mdeList(
          ctx,
          softwareId === undefined
            ? '/vulnerabilities'
            : `/Software/${encodeURIComponent(softwareId)}/vulnerabilities`,
          input,
          { permission: 'Vulnerability.Read.All', params: { $orderby: 'id' } }
        ),
    },

    // Indicators
    listIndicators: {
      isTool: true,
      scope: 'read',
      description:
        'List custom indicators (file hashes, IPs, domains, URLs, certificates) and the action each triggers, one page at a time, with an optional OData filter on application, createdByDisplayName, expirationTime, generateAlert, title, rbacGroupNames, rbacGroupIds, indicatorValue, indicatorType, creationTimeDateTimeUtc, createdBy, action, or severity, e.g. "indicatorValue eq \'192.0.2.10\'" or "action eq \'Block\'", to dedupe or verify a block. Returns value, count, hasMore (true when the page is full), and nextSkip (the skip for the next page); no indicators returns an empty list. A just-deleted indicator can still be listed for about 20 seconds.',
      input: ListInputSchema,
      handler: async (ctx, input: ListInput) => {
        try {
          return await mdeList(ctx, '/indicators', input, {
            permission: 'Ti.ReadWrite.All (or Ti.ReadWrite for the indicators the app created)',
          });
        } catch (error) {
          // The API can answer 404 ResourceNotFound when there is no indicator to list. Any other
          // 404 stays an error.
          if (isResourceNotFound(error)) {
            return { value: [], count: 0, hasMore: false };
          }
          throw error;
        }
      },
    },

    submitIndicator: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create or update a custom indicator for a file hash, certificate, IP address, domain, or URL. It applies to every device in the tenant (or the given device groups) at once: Block and BlockAndRemediate stop it everywhere, Allowed exempts it. IP indicators take a single public IPv4 address: Microsoft rejects private ranges such as 10.x. Submitting the same value, type, and action again updates that indicator; a different action creates a second indicator for the same value. Returns the indicator with its id; remove it with deleteIndicator. Prefer Audit (with generateAlert true) unless blocking was requested.',
      input: SubmitIndicatorInputSchema,
      handler: async (ctx, input: SubmitIndicatorInput) =>
        withoutODataContext(
          await mdeRequest(ctx, {
            method: 'POST',
            path: '/indicators',
            data: definedFields(input),
            permission: 'Ti.ReadWrite.All',
            idempotent: false,
          })
        ),
    },

    deleteIndicator: {
      // Not an agent tool: it removes a tenant-wide indicator, lifting its effect on every device.
      isTool: false,
      scope: 'destroy',
      description:
        'Delete a custom indicator by ID, removing its effect on every device. Recreate it with submitIndicator if needed. Returns { deleted: true, id }. Microsoft also answers success for an ID that does not exist, so the result does not prove the indicator existed; check with listIndicators when it matters.',
      input: DeleteIndicatorInputSchema,
      handler: async (ctx, input: DeleteIndicatorInput) => {
        const id = String(input.indicatorId);
        await mdeRequest(ctx, {
          method: 'DELETE',
          path: `/indicators/${encodeURIComponent(id)}`,
          permission: 'Ti.ReadWrite.All',
          idempotent: false,
        });
        return { deleted: true, id };
      },
    },

    batchSubmitIndicators: {
      // Not an agent tool: it changes up to 500 tenant-wide indicators in one call.
      isTool: false,
      scope: 'destroy',
      description:
        'Create or update up to 500 custom indicators in one call, for example to push a block list. Each indicator has the same fields as submitIndicator and applies tenant-wide. The call succeeds even when some indicators fail: returns value, one entry per indicator with id, indicator, isFailed, and failureReason, plus failedCount. Limited to 30 calls per minute and 15,000 active indicators per tenant.',
      input: BatchSubmitIndicatorsInputSchema,
      handler: async (ctx, input: BatchSubmitIndicatorsInput) => {
        const result = valueOf(
          await mdeRequest<{ value?: Array<{ isFailed?: boolean }> }>(ctx, {
            method: 'POST',
            path: '/indicators/import',
            data: { Indicators: input.indicators.map((indicator) => definedFields(indicator)) },
            permission: 'Ti.ReadWrite.All',
            idempotent: false,
          })
        );
        return {
          ...result,
          failedCount: result.value.filter((entry) => entry?.isFailed === true).length,
        };
      },
    },

    batchDeleteIndicators: {
      // Not an agent tool: it removes up to 500 tenant-wide indicators in one call.
      isTool: false,
      scope: 'destroy',
      description:
        'Delete up to 500 custom indicators by ID in one call, for example to retire a block list, removing their effect on every device. The call fails with 403 if an indicator belongs to a device group the app cannot see; unknown IDs are not rejected, so check with listIndicators when it matters. Returns { deleted: true, ids }. Limited to 30 calls per minute.',
      input: BatchDeleteIndicatorsInputSchema,
      handler: async (ctx, input: BatchDeleteIndicatorsInput) => {
        const ids = input.indicatorIds.map((id) => String(id));
        await mdeRequest(ctx, {
          method: 'POST',
          path: '/indicators/BatchDelete',
          data: { IndicatorIds: ids },
          permission: 'Ti.ReadWrite.All',
          idempotent: false,
        });
        return { deleted: true, ids };
      },
    },
  },

  skill: [
    '## Microsoft Defender for Endpoint',
    '',
    'Find, contain, and investigate devices onboarded to Microsoft Defender for Endpoint, and manage custom indicators. Alerts, incidents, and advanced hunting are in the Microsoft Defender XDR connector, not here.',
    '',
    '### Finding IDs',
    '- Device IDs are 40 hex characters. Find one with `getAgentList` (by `hostname`, `ipAddress`, `deviceId`, or an OData `filter`), or from the `machineId` field of an alert. `getAgentDetails` also accepts a computer name.',
    '- For an IP at a given time (the device may have changed IP since), pass `ipAddress` and `ipSeenAt` to `getAgentList`.',
    '- Indicator IDs come from `submitIndicator`, `batchSubmitIndicators`, or `listIndicators`.',
    '',
    '### Scoping an incident',
    '1. `getAgentDetails` for the device, then `getMachineUsers` for the accounts on it.',
    '2. Find related devices: `getFileDevices` (SHA-1), `getUserDevices` (user), `getDomainDevices` (domain).',
    '3. Score indicators before blocking: `getFileInfo` and `getFilePrevalence` (hash), `getIpPrevalence` (IP), `getDomainPrevalence` (domain).',
    '4. `getDeviceAvHealth` shows whether antivirus is active and up to date; `listVulnerabilities` lists CVEs.',
    '',
    '### Response actions',
    '- `isolateHost`, `releaseHost`, `runAntivirusScan`, `collectInvestigationPackage`, `restrictAppExecution`, `removeAppRestriction`, `stopAndQuarantineFile`, `runScript`, and `getFile` return a machine action with status Pending. Poll `getActions` with `actionId` set to its `id` until status is Succeeded, Failed, TimeOut, or Cancelled; `cancelAction` stops a Pending or InProgress one.',
    '- An isolated device stays isolated until `releaseHost` succeeds; a restricted one until `removeAppRestriction` succeeds.',
    '- `updateMachineTag` returns the updated device. Automated investigation (AIR) cannot be started on demand: Microsoft retired manual triggering in September 2026; run a Full `runAntivirusScan` instead.',
    '- `runScript` runs a script named by `getLibraryFiles`; `getFile` pulls a file off the device. After either succeeds, `getActionResults` returns a download link valid 30 minutes.',
    '- After `collectInvestigationPackage` succeeds, `getInvestigationUri` returns a short-lived download URL in `value`.',
    '- Only one action of a kind can be pending per device. The error then names the pending one (Conflicting machine action: id=..., type=..., status=...): wait for it with `getActions` or cancel it with `cancelAction`. `runAntivirusScan` always returns the pending scan instead of failing, and other actions such as `restrictAppExecution` and `collectInvestigationPackage` sometimes do too: if the returned id is an older pending action, wait for it.',
    '- Isolation and indicators affect production: act only on a confirmed threat or an explicit request, and say what you are about to do.',
    '',
    '### Indicators',
    '- `submitIndicator` applies tenant-wide. Prefer action Audit (with generateAlert true); use Block only when asked. Alert and AlertAndBlock are retired legacy actions and are not accepted: use Audit or Block with generateAlert true. IP indicators take a single public IPv4 address: private ranges, IPv6, and CIDR ranges are not supported. Resubmitting a value with a different action creates a second indicator, so delete the old one when changing the action. Check existing indicators with `listIndicators` first.',
    '',
    '### Paging and limits',
    '- List actions return one page (`top`, default 100). The API sends no next-page link: `hasMore` is true when the page is full, then call again with `skip` set to `nextSkip` (the last page can be empty).',
    '- A machine action created a few seconds ago can be missing from `getActions`, and `cancelAction` on it can answer 404: wait a few seconds and retry.',
    '- An IP address, domain, or user never seen returns zeros or an empty list, not an error.',
    '- Most APIs allow 100 calls per minute per tenant, live response 10, indicator batches and AV health 30. The connector retries a 429 while its total wait for the call stays within 30 seconds, then returns the rate-limit error.',
    '- A 403 means the app registration lacks the permission named in the error, or the device is in a device group the app cannot act on.',
  ].join('\n'),

  test: {
    // enabled must be explicitly set to true, otherwise the "Test connector"
    // button stays disabled in the UI even though a handler is defined.
    enabled: true,
    description:
      'Gets a token and lists one device to verify the credentials, the Defender cloud, and the API URL.',
    handler: async (ctx) => {
      try {
        await mdeRequest(ctx, get('/machines', 'Machine.Read.All', { $top: 1 }));
      } catch (error) {
        // 404 ResourceNotFound means the tenant has no devices seen in the last 30 days: the
        // credentials work. Any other 404 (for example a wrong API URL path) fails the test.
        if (!isResourceNotFound(error)) {
          throw error;
        }
      }
      return { message: 'Connected to the Microsoft Defender for Endpoint API.' };
    },
  },
};
