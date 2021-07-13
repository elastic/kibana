/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

import { operator } from '@kbn/securitysolution-io-ts-types';
import { severity } from '../severity';

export const severity_mapping_field = t.string;
export const severity_mapping_value = t.string;
export const severity_mapping_item = t.exact(
  t.type({
    field: severity_mapping_field,
    operator,
    value: severity_mapping_value,
    severity,
  })
);
export type SeverityMappingItem = t.TypeOf<typeof severity_mapping_item>;

export const severity_mapping = t.array(severity_mapping_item);
export type SeverityMapping = t.TypeOf<typeof severity_mapping>;

export const severityMappingOrUndefined = t.union([severity_mapping, t.undefined]);
export type SeverityMappingOrUndefined = t.TypeOf<typeof severityMappingOrUndefined>;
