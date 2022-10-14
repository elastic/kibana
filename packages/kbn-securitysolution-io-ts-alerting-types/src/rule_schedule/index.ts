/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { From } from '../from';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleInterval = t.TypeOf<typeof RuleInterval>;
export const RuleInterval = t.string; // we need a more specific schema

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleIntervalFrom = t.TypeOf<typeof RuleIntervalFrom>;
export const RuleIntervalFrom = From;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 * TODO: Create a regular expression type or custom date math part type here
 */
export type RuleIntervalTo = t.TypeOf<typeof RuleIntervalTo>;
export const RuleIntervalTo = t.string; // we need a more specific schema
