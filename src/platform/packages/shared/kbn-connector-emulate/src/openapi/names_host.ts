/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OperationServer } from './types';

// The authority of an absolute server URL, whose scheme may be a variable, as in `{scheme}://`.
const SERVER_HOST = /^(?:[a-z][a-z\d+.-]*|\{[^}]+\}):\/\/([^/?#]*)/i;
const VARIABLE = /\{([^}]+)\}/g;

/**
 * Whether a server names a host: its host has a literal part or a variable limited by an `enum`.
 * Relative servers, and hosts that are only free variables such as `https://{host}`, match any.
 */
export const serverNamesHost = ({ url, variables }: OperationServer): boolean => {
  const host = SERVER_HOST.exec(url)?.[1];
  if (host === undefined) {
    return false;
  }
  const fixed = host.replace(VARIABLE, (variable, name: string) =>
    variables[name]?.enum?.length ? variable : ''
  );
  return /[^.:-]/.test(fixed);
};
