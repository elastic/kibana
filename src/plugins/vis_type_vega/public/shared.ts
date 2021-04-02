/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// DRAFT PR bundle size experiment

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// Because we're exposing this to be used by other plugins with `strictNullChecks` enabled,
// we need to ignore this for now. A PR is up in vega-lite to hopefully fix this in future
// releases: https://github.com/vega/vega-lite/pull/7352
// @ts-ignore
import { compile } from 'vega-lite/build/vega-lite';
export { parse, View, Warn } from 'vega';
export { Handler } from 'vega-tooltip';
