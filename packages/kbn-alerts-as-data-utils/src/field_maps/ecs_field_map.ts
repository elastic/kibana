/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsFlat } from '@kbn/ecs';
import { EcsMetadata, FieldMap } from './types';

const EXCLUDED_TYPES = ['constant_keyword'];

// ECS fields that have reached Stage 2 in the RFC process
// are included in the generated Yaml but are still considered
// experimental. Some are correctly marked as beta but most are
// not.

// More about the RFC stages here: https://elastic.github.io/ecs/stages.html

// The following RFCS are currently in stage 2:
// https://github.com/elastic/ecs/blob/main/rfcs/text/0002-rfc-environment.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0009-data_stream-fields.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0015-create-file-elf.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0027-faas-fields.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0028-cgroups.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0034-device-fields.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0035-tty-output.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0037-host-metrics.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0040-volume-device.md

// Fields from these RFCs are manually identified as experimental below.
// The next time this list is updated, we should check the above list of RFCs to
// see if any have moved to Stage 3 and remove them from the list and check if
// there are any new stage 2 RFCs with fields we should identify as experimental.

const EXPERIMENTAL_FIELDS = [
  'data_stream.type',
  'data_stream.dataset',
  'data_stream.namespace',
  'device.id',
  'device.manufacturer',
  'device.model.identifier',
  'device.model.name',
  'faas.coldstart',
  'faas.execution',
  'faas.id',
  'faas.name',
  'faas.trigger',
  'faas.trigger.request_id',
  'faas.trigger.type',
  'faas.version',
  'file.elf.architecture',
  'file.elf.byte_order',
  'file.elf.cpu_type',
  'file.elf.creation_date',
  'file.elf.exports',
  'file.elf.segments',
  'file.elf.segments.sections',
  'file.elf.segments.type',
  'file.elf.header.abi_version',
  'file.elf.header.class',
  'file.elf.header.data',
  'file.elf.header.entrypoint',
  'file.elf.header.object_version',
  'file.elf.header.os_abi',
  'file.elf.header.type',
  'file.elf.header.version',
  'file.elf.imports',
  'file.elf.sections',
  'file.elf.sections.chi2',
  'file.elf.sections.entropy',
  'file.elf.sections.flags',
  'file.elf.sections.name',
  'file.elf.sections.physical_offset',
  'file.elf.sections.physical_size',
  'file.elf.sections.type',
  'file.elf.sections.virtual_address',
  'file.elf.sections.virtual_size',
  'file.elf.shared_libraries',
  'file.elf.telfhash',
  'host.network.egress.bytes',
  'host.network.ingress.bytes',
  'process.io',
  'process.io.bytes_skipped',
  'process.io.bytes_skipped.length',
  'process.io.bytes_skipped.offset',
  'process.io.max_bytes_per_process_exceeded',
  'process.io.text',
  'process.io.total_bytes_captured',
  'process.io.total_bytes_skipped',
  'process.io.type',
  'process.tty.columns',
  'process.tty.rows',
  'service.environment',
  'threat.enrichments.indicator.file.elf.architecture',
  'threat.enrichments.indicator.file.elf.byte_order',
  'threat.enrichments.indicator.file.elf.cpu_type',
  'threat.enrichments.indicator.file.elf.creation_date',
  'threat.enrichments.indicator.file.elf.exports',
  'threat.enrichments.indicator.file.elf.segments',
  'threat.enrichments.indicator.file.elf.segments.sections',
  'threat.enrichments.indicator.file.elf.segments.type',
  'threat.enrichments.indicator.file.elf.header.abi_version',
  'threat.enrichments.indicator.file.elf.header.class',
  'threat.enrichments.indicator.file.elf.header.data',
  'threat.enrichments.indicator.file.elf.header.entrypoint',
  'threat.enrichments.indicator.file.elf.header.object_version',
  'threat.enrichments.indicator.file.elf.header.os_abi',
  'threat.enrichments.indicator.file.elf.header.type',
  'threat.enrichments.indicator.file.elf.header.version',
  'threat.enrichments.indicator.file.elf.imports',
  'threat.enrichments.indicator.file.elf.sections',
  'threat.enrichments.indicator.file.elf.sections.chi2',
  'threat.enrichments.indicator.file.elf.sections.entropy',
  'threat.enrichments.indicator.file.elf.sections.flags',
  'threat.enrichments.indicator.file.elf.sections.name',
  'threat.enrichments.indicator.file.elf.sections.physical_offset',
  'threat.enrichments.indicator.file.elf.sections.physical_size',
  'threat.enrichments.indicator.file.elf.sections.type',
  'threat.enrichments.indicator.file.elf.sections.virtual_address',
  'threat.enrichments.indicator.file.elf.sections.virtual_size',
  'threat.enrichments.indicator.file.elf.shared_libraries',
  'threat.enrichments.indicator.file.elf.telfhash',
  'threat.indicator.file.elf.architecture',
  'threat.indicator.file.elf.byte_order',
  'threat.indicator.file.elf.cpu_type',
  'threat.indicator.file.elf.creation_date',
  'threat.indicator.file.elf.exports',
  'threat.indicator.file.elf.segments',
  'threat.indicator.file.elf.segments.sections',
  'threat.indicator.file.elf.segments.type',
  'threat.indicator.file.elf.header.abi_version',
  'threat.indicator.file.elf.header.class',
  'threat.indicator.file.elf.header.data',
  'threat.indicator.file.elf.header.entrypoint',
  'threat.indicator.file.elf.header.object_version',
  'threat.indicator.file.elf.header.os_abi',
  'threat.indicator.file.elf.header.type',
  'threat.indicator.file.elf.header.version',
  'threat.indicator.file.elf.imports',
  'threat.indicator.file.elf.sections',
  'threat.indicator.file.elf.sections.chi2',
  'threat.indicator.file.elf.sections.entropy',
  'threat.indicator.file.elf.sections.flags',
  'threat.indicator.file.elf.sections.name',
  'threat.indicator.file.elf.sections.physical_offset',
  'threat.indicator.file.elf.sections.physical_size',
  'threat.indicator.file.elf.sections.type',
  'threat.indicator.file.elf.sections.virtual_address',
  'threat.indicator.file.elf.sections.virtual_size',
  'threat.indicator.file.elf.shared_libraries',
  'threat.indicator.file.elf.telfhash',
  'volume.bus_type',
  'volume.default_access',
  'volume.device_name',
  'volume.device_type',
  'volume.dos_name',
  'volume.file_system_type',
  'volume.mount_name',
  'volume.nt_name',
  'volume.product_id',
  'volume.product_name',
  'volume.removable',
  'volume.serial_number',
  'volume.size',
  'volume.vendor_id',
  'volume.vendor_name',
  'volume.writable',
];

export const ecsFieldMap: FieldMap = Object.fromEntries(
  Object.entries(EcsFlat)
    .filter(
      ([key, value]) => !EXCLUDED_TYPES.includes(value.type) && !EXPERIMENTAL_FIELDS.includes(key)
    )
    .map(([key, _]) => {
      const value: EcsMetadata = EcsFlat[key as keyof typeof EcsFlat];
      return [
        key,
        {
          type: value.type,
          array: value.normalize.includes('array'),
          required: !!value.required,
          ...(value.scaling_factor ? { scaling_factor: value.scaling_factor } : {}),
          ...(value.ignore_above ? { ignore_above: value.ignore_above } : {}),
          ...(value.multi_fields ? { multi_fields: value.multi_fields } : {}),
        },
      ];
    })
);

export type EcsFieldMap = typeof ecsFieldMap;
