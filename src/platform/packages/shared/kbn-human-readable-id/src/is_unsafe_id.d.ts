/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns true if the ID is a known prototype-pollution key, empty, too long,
 * or contains path traversal sequences.
 *
 * @param maxLength — Upper bound for the ID length. Defaults to {@link HUMAN_READABLE_ID_MAX_LENGTH} (255).
 */
export declare const isUnsafeId: (id: string, maxLength?: number) => boolean;
