/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { getFlattenedObject } from '@kbn/std';

const SCHEMA_FILES = [
  'src/platform/plugins/shared/telemetry/schema/kbn_packages.json',
  'src/platform/plugins/shared/telemetry/schema/oss_platform.json',
  'src/platform/plugins/shared/telemetry/schema/oss_plugins.json',
  'src/platform/plugins/shared/telemetry/schema/oss_root.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_chat.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_monitoring.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_observability.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_platform.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_plugins.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_root.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_search.json',
  'x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_security.json',
];

// The idea behind this test is to apply usual checks to the telemetry schema, and avoid the need of a human PR review every time the schemas are updated.
describe('Telemetry Schema Checks', () => {
  test.each(SCHEMA_FILES)('[%s] DYNAMIC_KEY usage requires human review', async (schemaFile) => {
    const schema = JSON.parse(await readFile(schemaFile, 'utf8'));
    const flattenedSchema = getFlattenedObject(schema);
    const dynamicKeys = Object.keys(flattenedSchema).filter((key) => key.includes('DYNAMIC_KEY'));
    expect(dynamicKeys).toMatchSnapshot();
  });
});
