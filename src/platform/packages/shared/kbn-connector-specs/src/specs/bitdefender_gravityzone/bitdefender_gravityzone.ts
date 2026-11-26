/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Bitdefender GravityZone connector
 *
 * Endpoint search, isolation and restore, scanning, task monitoring,
 * quarantine management, blocklist operations, and configuration discovery
 * for SOC incident response.
 *
 * Authentication: HTTP Basic with the GravityZone API key as username,
 * empty password. All calls are JSON-RPC 2.0 POSTs to service-specific
 * paths under the configurable access URL.
 *
 * https://www.bitdefender.com/business/support/en/77212-125277-public-api.html
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import { jsonRpcRead, jsonRpcWrite } from './client';
import {
  SearchEndpointsInputSchema,
  GetEndpointInputSchema,
  IsolateEndpointInputSchema,
  RestoreEndpointFromIsolationInputSchema,
  ScanEndpointInputSchema,
  GetTaskInputSchema,
  ListQuarantineItemsInputSchema,
  RestoreQuarantineItemInputSchema,
  DeleteQuarantineItemInputSchema,
  QuarantineFileInputSchema,
  AddToBlocklistInputSchema,
  GetBlocklistItemsInputSchema,
  RemoveFromBlocklistInputSchema,
  ListGroupsInputSchema,
  ListPoliciesInputSchema,
  type SearchEndpointsInput,
  type GetEndpointInput,
  type IsolateEndpointInput,
  type RestoreEndpointFromIsolationInput,
  type ScanEndpointInput,
  type GetTaskInput,
  type ListQuarantineItemsInput,
  type RestoreQuarantineItemInput,
  type DeleteQuarantineItemInput,
  type QuarantineFileInput,
  type AddToBlocklistInput,
  type GetBlocklistItemsInput,
  type RemoveFromBlocklistInput,
  type ListGroupsInput,
  type ListPoliciesInput,
} from './types';

// ---------------------------------------------------------------------------
// Service paths
// ---------------------------------------------------------------------------

const NETWORK_V10 = '/v1.0/jsonrpc/network';
const NETWORK_V11 = '/v1.1/jsonrpc/network';
const INCIDENTS_V10 = '/v1.0/jsonrpc/incidents';
const INCIDENTS_V11 = '/v1.1/jsonrpc/incidents';
const QUARANTINE_V10 = '/v1.0/jsonrpc/quarantine/computers';
const QUARANTINE_V11 = '/v1.1/jsonrpc/quarantine/computers';
const POLICIES_V10 = '/v1.0/jsonrpc/policies';

// ---------------------------------------------------------------------------
// Bitdefender GravityZone connector spec
// ---------------------------------------------------------------------------

export const BitdefenderGravityzone: ConnectorSpec = {
  metadata: {
    id: '.bitdefender_gravityzone',
    displayName: 'Bitdefender GravityZone',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.bitdefenderGravityzone.metadata.description',
      {
        defaultMessage:
          'Search and isolate endpoints, scan for malware, manage quarantine and blocklist entries via GravityZone.',
      }
    ),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        defaults: { headerField: 'Authorization' },
        overrides: {
          label: i18n.translate(
            'core.kibanaConnectorSpecs.bitdefenderGravityzone.auth.label',
            { defaultMessage: 'API key' }
          ),
          meta: {
            apiKey: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.bitdefenderGravityzone.auth.apiKeyLabel',
                { defaultMessage: 'API key' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.bitdefenderGravityzone.auth.apiKeyHelpText',
                {
                  defaultMessage:
                    'GravityZone API key from Control Center: My Account > API keys. ' +
                    'The key must have the API areas enabled for the actions you use ' +
                    '(Network, Incidents, Quarantine, Policies).',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      accessUrl: UISchemas.url('https://cloudap.gravityzone.bitdefender.com/api')
        .max(2048)
        .refine(
          (v) => {
            try {
              const { protocol, hostname } = new URL(v);
              // Refuse non-HTTPS; allow HTTP only for loopback (local emulators)
              if (protocol !== 'https:') {
                const isLoopback =
                  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
                return protocol === 'http:' && isLoopback;
              }
              return true;
            } catch {
              return false;
            }
          },
          { message: 'The GravityZone API URL must use HTTPS' }
        )
        .meta({
          label: i18n.translate(
            'core.kibanaConnectorSpecs.bitdefenderGravityzone.config.accessUrlLabel',
            { defaultMessage: 'GravityZone API access URL' }
          ),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.bitdefenderGravityzone.config.accessUrlHelpText',
            {
              defaultMessage:
                'Full base URL of the GravityZone Cloud API (up to and including /api). ' +
                'The URL must use HTTPS. It varies by account region.',
            }
          ),
          placeholder: 'https://cloudap.gravityzone.bitdefender.com/api',
          validate: { allowedHosts: true },
        }),
    })
  ),

  test: {
    enabled: true,
    description: i18n.translate(
      'core.kibanaConnectorSpecs.bitdefenderGravityzone.test.description',
      {
        defaultMessage:
          'Calls getNetworkInventoryItems with a single-item page to verify the API key and Network API area permission.',
      }
    ),
    handler: async (ctx) => {
      const result = await jsonRpcRead(ctx, NETWORK_V10, 'getNetworkInventoryItems', {
        page: 1,
        perPage: 1,
      });
      if (result == null || typeof result !== 'object') {
        throw new Error('Unexpected response from GravityZone API: invalid response shape');
      }
      return { result };
    },
  },

  skill: [
    '## Bitdefender GravityZone Connector',
    '',
    'Use this connector to investigate and respond to endpoint threats detected by Bitdefender GravityZone.',
    '',
    '### Endpoint investigation',
    '1. Call `searchEndpoints` to find endpoints by name, IP or hostname.',
    '2. Call `getEndpoint` with an endpoint ID to get full details: OS, agent status, policy, isolation state.',
    '',
    '### Endpoint containment',
    '1. Call `isolateEndpoint` with endpoint IDs to network-isolate them (async task).',
    '2. Call `getTask` with the returned task ID to poll until status is 3 (Finished).',
    '3. Call `getEndpoint` to confirm isIsolated is true.',
    '4. Call `restoreEndpointFromIsolation` to reconnect endpoints after remediation.',
    '',
    '### Scanning',
    '- Call `scanEndpoint` with target IDs and a scan type (1=Quick, 2=Full, 3=Memory, 4=Custom).',
    '- Poll with `getTask` until status is 3.',
    '',
    '### Quarantine management',
    '- Call `listQuarantineItems` to see quarantined files. Filter by endpoint with `endpointId`.',
    '- Call `restoreQuarantineItem` to restore files, or `deleteQuarantineItem` to permanently remove them.',
    '- Call `quarantineFile` to quarantine a specific file by path on target endpoints.',
    '',
    '### Blocklist',
    '- Call `addToBlocklist` with SHA256 or MD5 hashes to block files across all endpoints.',
    '- Call `getBlocklistItems` to list current blocklist entries.',
    '- Call `removeFromBlocklist` with a blocklist item ID to remove an entry.',
    '',
    '### Configuration discovery',
    '- Call `listGroups` to see endpoint groups. Call `listPolicies` to see security policies.',
    '',
    '### Pagination',
    '- Paginated actions (searchEndpoints, listQuarantineItems, getBlocklistItems, listPolicies) accept `page` (1-based) and `perPage` (max 100). The response includes `pagesCount`; stop when page >= pagesCount.',
    '- listGroups returns all child groups in one call (no pagination).',
    '',
    '### Task polling',
    '- Mutating actions return task IDs. Call `getTask` to poll: status 1=Pending, 2=In progress, 3=Finished.',
    '- Set `returnSubtasks: true` to see per-endpoint subtask details.',
  ].join('\n'),

  actions: {
    // -----------------------------------------------------------------------
    // Investigation
    // -----------------------------------------------------------------------

    searchEndpoints: {
      isTool: true,
      scope: 'read',
      description:
        'Find managed endpoints by name, IP or hostname. Returns IDs, names, IPs, group and isolation status. Use to find endpoint IDs before isolation or scanning.',
      input: SearchEndpointsInputSchema,
      handler: async (ctx, input: SearchEndpointsInput) => {
        const params: Record<string, unknown> = {};
        if (input.page != null) params.page = input.page;
        if (input.perPage != null) params.perPage = input.perPage;
        if (input.filters != null) params.filters = input.filters;
        if (input.options != null) params.options = input.options;
        return jsonRpcRead(ctx, NETWORK_V10, 'getNetworkInventoryItems', params);
      },
    },

    getEndpoint: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for a single endpoint: OS, agent status, policy, isolation state. Use to enrich alerts or verify isolation.',
      input: GetEndpointInputSchema,
      handler: async (ctx, input: GetEndpointInput) => {
        const params: Record<string, unknown> = { endpointId: input.endpointId };
        if (input.options != null) params.options = input.options;
        return jsonRpcRead(ctx, NETWORK_V10, 'getManagedEndpointDetails', params);
      },
    },

    getTask: {
      isTool: true,
      scope: 'read',
      description:
        'Poll the status of an async task. Status: 1=Pending, 2=In progress, 3=Finished. Set returnSubtasks to true for per-endpoint detail.',
      input: GetTaskInputSchema,
      handler: async (ctx, input: GetTaskInput) => {
        const params: Record<string, unknown> = { taskId: input.taskId };
        if (input.returnSubtasks != null) params.returnSubtasks = input.returnSubtasks;
        if (input.status != null) params.status = input.status;
        return jsonRpcRead(ctx, NETWORK_V11, 'getTaskStatus', params);
      },
    },

    // -----------------------------------------------------------------------
    // Response actions
    // -----------------------------------------------------------------------

    isolateEndpoint: {
      isTool: false,
      scope: 'destroy',
      description:
        'Network-isolate endpoints (async). Returns task IDs. All-or-nothing: if any endpoint ID is invalid or unknown, the entire request is rejected and no endpoint is isolated.',
      input: IsolateEndpointInputSchema,
      handler: async (ctx, input: IsolateEndpointInput) => {
        return jsonRpcWrite(ctx, INCIDENTS_V11, 'createIsolateEndpointTask', {
          endpointIds: input.endpointIds,
        });
      },
    },

    restoreEndpointFromIsolation: {
      isTool: false,
      scope: 'destroy',
      description:
        'Restore endpoints from network isolation (async). Returns task IDs. All-or-nothing: if any endpoint ID is invalid or unknown, the entire request is rejected.',
      input: RestoreEndpointFromIsolationInputSchema,
      handler: async (ctx, input: RestoreEndpointFromIsolationInput) => {
        return jsonRpcWrite(ctx, INCIDENTS_V11, 'createRestoreEndpointFromIsolationTask', {
          endpointIds: input.endpointIds,
        });
      },
    },

    scanEndpoint: {
      isTool: true,
      scope: 'write',
      description:
        'Launch a scan on endpoints or groups (async). Type: 1=Quick, 2=Full, 3=Memory, 4=Custom. Returns task ID(s).',
      input: ScanEndpointInputSchema,
      handler: async (ctx, input: ScanEndpointInput) => {
        const params: Record<string, unknown> = {
          targetIds: input.targetIds,
          type: input.type,
        };
        if (input.name != null) params.name = input.name;
        if (input.customScanSettings != null) params.customScanSettings = input.customScanSettings;
        if (input.returnAllTaskIds != null) params.returnAllTaskIds = input.returnAllTaskIds;
        return jsonRpcWrite(ctx, NETWORK_V10, 'createScanTask', params);
      },
    },

    quarantineFile: {
      isTool: false,
      scope: 'destroy',
      description:
        'Quarantine a file by path on target endpoints (async). Requires EDR Sensor in Detection and prevention mode.',
      input: QuarantineFileInputSchema,
      handler: async (ctx, input: QuarantineFileInput) => {
        return jsonRpcWrite(ctx, QUARANTINE_V11, 'createAddFileToQuarantineTask', {
          endpointIds: input.endpointIds,
          filePath: input.filePath,
        });
      },
    },

    // -----------------------------------------------------------------------
    // Quarantine management
    // -----------------------------------------------------------------------

    listQuarantineItems: {
      isTool: true,
      scope: 'read',
      description:
        'List quarantined files for the account. Filter by endpoint with endpointId. Paginated.',
      input: ListQuarantineItemsInputSchema,
      handler: async (ctx, input: ListQuarantineItemsInput) => {
        const params: Record<string, unknown> = {};
        if (input.page != null) params.page = input.page;
        if (input.perPage != null) params.perPage = input.perPage;
        if (input.endpointId != null) params.endpointId = input.endpointId;
        return jsonRpcRead(ctx, QUARANTINE_V10, 'getQuarantineItemsList', params);
      },
    },

    restoreQuarantineItem: {
      isTool: false,
      scope: 'write',
      description:
        'Restore quarantined files to their original or a specified location. Optionally adds an exclusion policy.',
      input: RestoreQuarantineItemInputSchema,
      handler: async (ctx, input: RestoreQuarantineItemInput) => {
        const params: Record<string, unknown> = {
          quarantineItemsIds: input.quarantineItemsIds,
        };
        if (input.locationToRestore != null) params.locationToRestore = input.locationToRestore;
        if (input.addExclusionInPolicy != null)
          params.addExclusionInPolicy = input.addExclusionInPolicy;
        const result = await jsonRpcWrite(
          ctx,
          QUARANTINE_V10,
          'createRestoreQuarantineItemTask',
          params
        );
        if (result === false) {
          throw new Error('Task creation was unsuccessful: the API returned false');
        }
        return { requested: true, result };
      },
    },

    deleteQuarantineItem: {
      isTool: false,
      scope: 'destroy',
      description:
        'Permanently delete quarantined files (irreversible).',
      input: DeleteQuarantineItemInputSchema,
      handler: async (ctx, input: DeleteQuarantineItemInput) => {
        const result = await jsonRpcWrite(
          ctx,
          QUARANTINE_V10,
          'createRemoveQuarantineItemTask',
          {
            quarantineItemsIds: input.quarantineItemsIds,
          }
        );
        if (result === false) {
          throw new Error('Task creation was unsuccessful: the API returned false');
        }
        return { requested: true, result };
      },
    },

    // -----------------------------------------------------------------------
    // Blocklist
    // -----------------------------------------------------------------------

    addToBlocklist: {
      isTool: true,
      scope: 'write',
      description:
        'Add file hashes (SHA256 or MD5) to the GravityZone blocklist. Requires EDR licence. To remove an entry later, retrieve its hashItemId with getBlocklistItems, then call removeFromBlocklist.',
      input: AddToBlocklistInputSchema,
      handler: async (ctx, input: AddToBlocklistInput) => {
        return jsonRpcWrite(ctx, INCIDENTS_V10, 'addToBlocklist', {
          hashType: input.hashType,
          hashList: input.hashList,
          sourceInfo: input.sourceInfo,
        });
      },
    },

    getBlocklistItems: {
      isTool: true,
      scope: 'read',
      description:
        'List blocklist entries for the company. Each item shows hash type, hash value and source. Paginated.',
      input: GetBlocklistItemsInputSchema,
      handler: async (ctx, input: GetBlocklistItemsInput) => {
        const params: Record<string, unknown> = {};
        if (input.page != null) params.page = input.page;
        if (input.perPage != null) params.perPage = input.perPage;
        return jsonRpcRead(ctx, INCIDENTS_V10, 'getBlocklistItems', params);
      },
    },

    removeFromBlocklist: {
      isTool: false,
      scope: 'destroy',
      description:
        'Remove an entry from the GravityZone blocklist by its item ID.',
      input: RemoveFromBlocklistInputSchema,
      handler: async (ctx, input: RemoveFromBlocklistInput) => {
        return jsonRpcWrite(ctx, INCIDENTS_V10, 'removeFromBlocklist', {
          hashItemId: input.hashItemId,
        });
      },
    },

    // -----------------------------------------------------------------------
    // Configuration discovery
    // -----------------------------------------------------------------------

    listGroups: {
      isTool: true,
      scope: 'read',
      description:
        'List custom endpoint groups under a parent node. Omit parentId for top-level groups.',
      input: ListGroupsInputSchema,
      handler: async (ctx, input: ListGroupsInput) => {
        const params: Record<string, unknown> = {};
        if (input.parentId != null) params.parentId = input.parentId;
        return jsonRpcRead(ctx, NETWORK_V10, 'getCustomGroupsList', params);
      },
    },

    listPolicies: {
      isTool: true,
      scope: 'read',
      description:
        'List security policies defined in the GravityZone account. Paginated.',
      input: ListPoliciesInputSchema,
      handler: async (ctx, input: ListPoliciesInput) => {
        const params: Record<string, unknown> = {};
        if (input.page != null) params.page = input.page;
        if (input.perPage != null) params.perPage = input.perPage;
        return jsonRpcRead(ctx, POLICIES_V10, 'getPoliciesList', params);
      },
    },
  },
};
