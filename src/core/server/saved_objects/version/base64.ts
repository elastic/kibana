/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const decodeBase64 = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');
export const encodeBase64 = (utf8: string) => Buffer.from(utf8, 'utf8').toString('base64');
