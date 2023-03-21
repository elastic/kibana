/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import fs from 'fs/promises';

import { GROUP_CPU, GROUP_CPUACCT } from './constants';

const CONTROL_GROUP_RE = new RegExp('\\d+:([^:]+):(/.*)');
const CONTROLLER_SEPARATOR_RE = ',';
const PROC_SELF_CGROUP_FILE = '/proc/self/cgroup';

/**
 * Check whether the contents of /proc/self/cgroup indicate that we are running in a cgroup v2
 *
 * @note cgroup v2 is always in the format "0::<PATH>". See https://www.kernel.org/doc/Documentation/cgroup-v2.txt.
 */
function isCgroups2(procSelfLines: string[]): boolean {
  return procSelfLines.length === 1 && procSelfLines[0].trim().startsWith('0::');
}

async function readProcSelf(): Promise<string[]> {
  const data = (await fs.readFile(PROC_SELF_CGROUP_FILE)).toString();
  return data.split(/\n/).filter((line) => line.trim().length > 0);
}

interface Result {
  data: Record<string, string>;
  v2: boolean;
}

export async function gatherInfo(): Promise<Result> {
  const lines = await readProcSelf();

  if (isCgroups2(lines)) {
    // eslint-disable-next-line prettier/prettier
    const [/* '0' */, /* '' */, path] = lines[0].trim().split(':');
    return {
      data: {
        [GROUP_CPU]: path,
        [GROUP_CPUACCT]: path,
      },
      v2: true,
    };
  }

  const data = lines.reduce((acc, line) => {
    const matches = line.match(CONTROL_GROUP_RE);

    if (matches !== null) {
      const controllers = matches[1].split(CONTROLLER_SEPARATOR_RE);
      controllers.forEach((controller) => {
        acc[controller] = matches[2];
      });
    }

    return acc;
  }, {} as Record<string, string>);

  return { data, v2: false };
}
