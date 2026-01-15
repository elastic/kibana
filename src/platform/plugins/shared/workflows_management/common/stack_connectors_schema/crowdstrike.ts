/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/crowdstrike.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// CrowdStrike connector parameter schemas for different sub-actions

export const CrowdstrikeGetAgentDetailsParamsSchema = z.object({
  ids: z.array(z.string()),
});

export const CrowdstrikeGetAgentOnlineStatusParamsSchema = z.object({
  ids: z.array(z.string()),
});

export const CrowdstrikeHostActionsParamsSchema = z.object({
  command: z.enum(['contain', 'lift_containment']),
  ids: z.array(z.string()),
  actionParameters: z.record(z.string(), z.any()).optional(),
});

export const CrowdstrikeExecuteRTRCommandParamsSchema = z.object({
  command: z.string(),
  endpoint_ids: z.array(z.string()),
});

export const CrowdstrikeGetRTRCloudScriptsParamsSchema = z.object({});

// CrowdStrike connector response schemas

export const CrowdstrikeDeviceSchema = z.object({
  device_id: z.string(),
  cid: z.string().optional(),
  agent_load_flags: z.string().optional(),
  agent_local_time: z.string().optional(),
  agent_version: z.string().optional(),
  bios_manufacturer: z.string().optional(),
  bios_version: z.string().optional(),
  config_id_base: z.string().optional(),
  config_id_build: z.string().optional(),
  config_id_platform: z.string().optional(),
  external_ip: z.string().optional(),
  mac_address: z.string().optional(),
  hostname: z.string().optional(),
  first_seen: z.string().optional(),
  last_seen: z.string().optional(),
  local_ip: z.string().optional(),
  major_version: z.string().optional(),
  minor_version: z.string().optional(),
  os_version: z.string().optional(),
  platform_id: z.string().optional(),
  platform_name: z.string().optional(),
  policies: z.array(z.any()).optional(),
  reduced_functionality_mode: z.string().optional(),
  device_policies: z.any().optional(),
  groups: z.array(z.string()).optional(),
  group_hash: z.string().optional(),
  product_type: z.string().optional(),
  product_type_desc: z.string().optional(),
  provision_status: z.string().optional(),
  serial_number: z.string().optional(),
  service_pack_major: z.string().optional(),
  service_pack_minor: z.string().optional(),
  pointer_size: z.string().optional(),
  status: z.string().optional(),
  system_manufacturer: z.string().optional(),
  system_product_name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  modified_timestamp: z.string().optional(),
  slow_changing_modified_timestamp: z.string().optional(),
  meta: z.any().optional(),
  zone_group: z.string().optional(),
  kernel_version: z.string().optional(),
  chassis_type: z.string().optional(),
  chassis_type_desc: z.string().optional(),
  connection_ip: z.string().optional(),
  default_gateway_ip: z.string().optional(),
  connection_mac_address: z.string().optional(),
  linux_sensor_mode: z.string().optional(),
});

export const CrowdstrikeGetAgentDetailsResponseSchema = z.object({
  meta: z.object({
    query_time: z.number(),
    powered_by: z.string().optional(),
    trace_id: z.string().optional(),
  }),
  resources: z.array(CrowdstrikeDeviceSchema),
  errors: z.array(z.any()).optional(),
});

export const CrowdstrikeOnlineStatusSchema = z.object({
  id: z.string(),
  cid: z.string().optional(),
  state: z.string(),
  last_seen: z.string().optional(),
});

export const CrowdstrikeGetAgentOnlineStatusResponseSchema = z.object({
  meta: z.object({
    query_time: z.number(),
    powered_by: z.string().optional(),
    trace_id: z.string().optional(),
  }),
  resources: z.array(CrowdstrikeOnlineStatusSchema),
  errors: z.array(z.any()).optional(),
});

export const CrowdstrikeHostActionsResponseSchema = z.object({
  id: z.string(),
  path: z.string(),
});

export const CrowdstrikeRTRSessionResourceSchema = z.object({
  session_id: z.string(),
  task_id: z.string().optional(),
  complete: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  base_command: z.string(),
  aid: z.string(),
  errors: z.array(z.any()).nullable().optional(),
  query_time: z.number().optional(),
  offline_queued: z.boolean(),
});

export const CrowdstrikeExecuteRTRResponseSchema = z.object({
  combined: z.object({
    resources: z.record(z.string(), CrowdstrikeRTRSessionResourceSchema),
  }),
  meta: z.object({
    query_time: z.number(),
    powered_by: z.string().optional(),
    trace_id: z.string().optional(),
  }),
  errors: z.array(z.any()).optional(),
});

export const CrowdstrikeScriptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  platform: z.array(z.string()).optional(),
  permission_type: z.string().optional(),
  created_by: z.string().optional(),
  created_by_uuid: z.string().optional(),
  created_timestamp: z.string().optional(),
  modified_by: z.string().optional(),
  modified_timestamp: z.string().optional(),
  sha256: z.string().optional(),
  size: z.number().optional(),
  content: z.string().optional(),
  write_access: z.boolean().optional(),
});

export const CrowdstrikeGetRTRCloudScriptsResponseSchema = z.object({
  meta: z.object({
    query_time: z.number(),
    powered_by: z.string().optional(),
    trace_id: z.string().optional(),
  }),
  resources: z.array(CrowdstrikeScriptSchema).optional(),
  errors: z.array(z.any()).optional(),
});
