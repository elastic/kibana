/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

export interface RunningServers {
  pid: string;
  arch?: string;
  domain?: string;
  configSet: string;
}

const getFlag = (args: string[], name: string) => {
  const index = args.findIndex((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  return index === -1 ? undefined : args[index].split('=')[1] ?? args[index + 1];
};

/** `node scripts/scout start-server` processes with the target they were started for */
export const getRunningServers = async (): Promise<RunningServers[]> => {
  const { stdout } = await execa('ps', ['-ax', '-o', 'pid=,command=']);
  return stdout.split('\n').flatMap((line) => {
    const [pid, command, ...args] = line.trim().split(/\s+/);
    if (!/(^|\/)node$/.test(command) || !args.join(' ').includes('scripts/scout start-server')) {
      return [];
    }
    return [
      {
        pid,
        arch: getFlag(args, 'arch'),
        domain: getFlag(args, 'domain'),
        configSet: getFlag(args, 'serverConfigSet') ?? 'default',
      },
    ];
  });
};
