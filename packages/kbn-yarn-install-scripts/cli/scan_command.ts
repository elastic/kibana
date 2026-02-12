/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Table from 'cli-table3';
import { createFailError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';

import { loadConfig, scanInstallScripts, MANAGED_LIFECYCLES } from '../src';

export function scanCommand(log: ToolingLog, validate: boolean): void {
  const packages = scanInstallScripts();

  if (packages.length === 0) {
    log.success('No packages with install scripts found.');
    return;
  }

  const config = loadConfig();
  const configMap = new Map(config.packages.map((p) => [`${p.path}:${p.lifecycle}`, p.required]));

  const table = new Table({
    head: ['Package', 'Status', 'Version', 'Lifecycle', 'Script'],
  });

  // Sort by lifecycle order, then alphabetically by path
  const sortedPackages = [...packages].sort((a, b) => {
    const lifecycleDiff =
      MANAGED_LIFECYCLES.indexOf(a.lifecycle) - MANAGED_LIFECYCLES.indexOf(b.lifecycle);
    if (lifecycleDiff !== 0) return lifecycleDiff;
    return a.path.localeCompare(b.path);
  });

  let requiredCount = 0;
  let skipCount = 0;
  let unconfiguredCount = 0;

  for (const pkg of sortedPackages) {
    const script = pkg.script.length > 50 ? pkg.script.substring(0, 47) + '...' : pkg.script;
    const key = `${pkg.path}:${pkg.lifecycle}`;
    const required = configMap.get(key);
    let status: string;
    if (required === true) {
      status = 'required';
      requiredCount++;
    } else if (required === false) {
      status = 'skipped';
      skipCount++;
    } else {
      status = 'unconfigured';
      unconfiguredCount++;
    }
    table.push([pkg.path, status, pkg.version, pkg.lifecycle, script]);
  }

  log.info(table.toString());
  log.success(
    `Found ${packages.length} install scripts: ${requiredCount} required, ${skipCount} skipped, ${unconfiguredCount} unconfigured`
  );

  if (unconfiguredCount > 0) {
    const message = `${unconfiguredCount} unconfigured install script(s) found.

To resolve, add each unconfigured package to:
  packages/kbn-yarn-install-scripts/config.json

For each package, determine if the script is required:
  - true: Script must run (e.g. downloads chromedriver, required for functional tests)
  - false: Script does not need to run (e.g. informational message)

Example entry:
  {
    "path": "package-name",
    "lifecycle": "postinstall",
    "required": true,
    "reason": "Explanation of why this is required or not"
  }
`;
    if (validate) {
      throw createFailError(message);
    } else {
      log.warning(message);
    }
  }
}
