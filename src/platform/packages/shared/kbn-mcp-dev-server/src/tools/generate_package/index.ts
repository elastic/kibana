/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import execa from 'execa';
import { KibanaGroup } from '@kbn/projects-solutions-groups';
import { REPO_ROOT } from '@kbn/repo-info';

export async function generatePackage({
  name,
  owner,
  group,
}: {
  name: string;
  owner: string;
  group: KibanaGroup;
}): Promise<string> {
  const { stdout } = await execa.command(
    `node scripts/generate.js package ${name} \\
      --owner ${owner} \\
      --group ${group} \\`,
    {
      cwd: REPO_ROOT,
    }
  );

  return stdout;
}
