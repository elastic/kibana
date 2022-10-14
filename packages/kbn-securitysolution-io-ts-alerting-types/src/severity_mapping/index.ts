/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { operator } from '@kbn/securitysolution-io-ts-types';
import { Severity } from '../severity';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type SeverityMappingItem = t.TypeOf<typeof SeverityMappingItem>;
export const SeverityMappingItem = t.exact(
  t.type({
    field: t.string,
    operator,
    value: t.string,
    severity: Severity,
  })
);

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type SeverityMapping = t.TypeOf<typeof SeverityMapping>;
export const SeverityMapping = t.array(SeverityMappingItem);
