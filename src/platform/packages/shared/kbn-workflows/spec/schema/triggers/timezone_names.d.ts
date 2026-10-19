/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * IANA timezone names list
 *
 * Hardcoded to avoid bundling moment-timezone data (~900KB) in plugins.
 * Source: moment.tz.names() output
 *
 * If timezone support needs updating, regenerate from latest moment-timezone
 * using: `require('moment-timezone').tz.names()`
 */
export declare const timezoneNames: string[];
