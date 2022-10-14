/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type Severity = t.TypeOf<typeof Severity>;
export const Severity = t.keyof({ low: null, medium: null, high: null, critical: null });
