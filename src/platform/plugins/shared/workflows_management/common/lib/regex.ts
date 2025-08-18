/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MUSTACHE_REGEX_GLOBAL = /\{\{\s*(?<key>\S*?)\s*\}\}/g;
export const UNFINISHED_MUSTACHE_REGEX_GLOBAL = /\{\{\s*(?<key>\S*?)\s*$/g;

export const ALLOWED_KEY_REGEX =
  /^[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\s*(?:\d+|"[^"]*"|'[^']*')\s*\])*(?:\s*\|.*)?$/;

export const PROPERTY_PATH_REGEX =
  /^[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\s*(?:\d+|"[^"]*"|'[^']*')\s*\])*$/;
