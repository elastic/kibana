/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const severity = t.keyof({ low: null, medium: null, high: null, critical: null });
export type Severity = t.TypeOf<typeof severity>;

export const severityOrUndefined = t.union([severity, t.undefined]);
export type SeverityOrUndefined = t.TypeOf<typeof severityOrUndefined>;
