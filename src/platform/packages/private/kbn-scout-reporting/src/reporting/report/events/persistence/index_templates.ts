/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IndicesPutIndexTemplateRequest } from 'elasticsearch-8.x/lib/api/types'; // Switch to `@elastic/elasticsearch` when the CI cluster is upgraded.
import { SCOUT_TEST_EVENTS_TEMPLATE_NAME, SCOUT_TEST_EVENTS_INDEX_PATTERN } from '@kbn/scout-info';
import * as componentTemplates from './component_templates';

export const testEvents: IndicesPutIndexTemplateRequest = {
  name: SCOUT_TEST_EVENTS_TEMPLATE_NAME,
  version: 1,
  data_stream: {},
  index_patterns: SCOUT_TEST_EVENTS_INDEX_PATTERN,
  composed_of: [
    'ecs@mappings',
    componentTemplates.buildkiteMappings.name,
    componentTemplates.reporterMappings.name,
    componentTemplates.testRunMappings.name,
    componentTemplates.suiteMappings.name,
    componentTemplates.testMappings.name,
  ],
};
