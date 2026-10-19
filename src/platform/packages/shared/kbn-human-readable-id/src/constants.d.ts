/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const HUMAN_READABLE_ID_PATTERN: RegExp;
export declare const HUMAN_READABLE_ID_MAX_LENGTH = 255;
export declare const HUMAN_READABLE_ID_MIN_LENGTH = 3;
export declare const MAX_COLLISION_RETRIES = 100;
/** Known prototype-pollution keys that must never be used as IDs. */
export declare const UNSAFE_IDS: Set<string>;
