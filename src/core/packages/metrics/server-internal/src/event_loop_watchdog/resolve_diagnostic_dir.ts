/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const OPTION = '--diagnostic-dir';

/**
 * Splits `NODE_OPTIONS` the way Node does. Kibana's start script quotes the directory. Spaces
 * separate options. A double-quoted value can hold spaces. Inside quotes, a backslash escapes the
 * next character.
 */
const splitNodeOptions = (nodeOptions: string): string[] => {
  const options: string[] = [];
  let option: string | undefined;
  let quoted = false;
  for (let i = 0; i < nodeOptions.length; i++) {
    const char = nodeOptions[i];
    if (quoted && char === '\\' && i + 1 < nodeOptions.length) {
      option = (option ?? '') + nodeOptions[++i];
    } else if (char === '"') {
      quoted = !quoted;
      option ??= '';
    } else if (char === ' ' && !quoted) {
      if (option !== undefined) {
        options.push(option);
        option = undefined;
      }
    } else {
      option = (option ?? '') + char;
    }
  }
  if (option !== undefined) {
    options.push(option);
  }
  return options;
};

/**
 * Returns Node's `--diagnostic-dir`, the directory for diagnostic files such as heap snapshots and
 * CPU profiles. The last occurrence wins. Command-line flags override `NODE_OPTIONS`. An empty
 * value means no directory.
 */
export const resolveDiagnosticDir = (
  execArgv: readonly string[] = process.execArgv,
  nodeOptions: string = process.env.NODE_OPTIONS ?? ''
): string | undefined => {
  const args = [...splitNodeOptions(nodeOptions), ...execArgv];
  let dir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const separator = args[i].indexOf('=');
    const name = separator === -1 ? args[i] : args[i].slice(0, separator);
    if (name.replace(/_/g, '-') !== OPTION) {
      continue;
    }
    dir = separator === -1 ? args[++i] : args[i].slice(separator + 1);
  }
  return dir || undefined;
};
