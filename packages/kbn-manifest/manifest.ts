/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { writeFile } from 'fs/promises';
import { flatMap, unset } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Flags } from '@kbn/dev-cli-runner';
import { type Package, getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

const MANIFEST_FILE = 'kibana.jsonc';

const getKibanaJsonc = (flags: Flags, log: ToolingLog): Package[] => {
  const modules = getPackages(REPO_ROOT);

  let packageIds: string[] = [];
  let pluginIds: string[] = [];

  if (typeof flags.package === 'string') {
    packageIds = [flags.package].filter(Boolean);
  } else if (Array.isArray(flags.package)) {
    packageIds = [...flags.package].filter(Boolean);
  }

  if (typeof flags.plugin === 'string') {
    pluginIds = [flags.plugin].filter(Boolean);
  } else if (Array.isArray(flags.plugin)) {
    pluginIds = [...flags.plugin].filter(Boolean);
  }

  return modules.filter(
    (pkg) =>
      packageIds.includes(pkg.id) || (pkg.isPlugin() && pluginIds.includes(pkg.manifest.plugin.id))
  );
};

export const listManifestFiles = (flags: Flags, log: ToolingLog) => {
  const modules = getPackages(REPO_ROOT);
  modules
    .filter((module) => module.manifest.type === 'plugin')
    .forEach((module) => {
      log.info(join(module.directory, MANIFEST_FILE), module.id);
    });
};

export const printManifest = (flags: Flags, log: ToolingLog) => {
  const kibanaJsoncs = getKibanaJsonc(flags, log);
  kibanaJsoncs.forEach((kibanaJsonc) => {
    const manifestPath = join(kibanaJsonc.directory, MANIFEST_FILE);
    log.info('\n\nShowing manifest: ', manifestPath);
    log.info(JSON.stringify(kibanaJsonc, null, 2));
  });
};

export const updateManifest = async (flags: Flags, log: ToolingLog) => {
  let toSet: string[] = [];
  let toUnset: string[] = [];

  if (typeof flags.set === 'string') {
    toSet = [flags.set].filter(Boolean);
  } else if (Array.isArray(flags.set)) {
    toSet = [...flags.set].filter(Boolean);
  }

  if (typeof flags.unset === 'string') {
    toUnset = [flags.unset].filter(Boolean);
  } else if (Array.isArray(flags.unset)) {
    toUnset = [...flags.unset].filter(Boolean);
  }

  if (!toSet.length && !toUnset.length) {
    // no need to update anything
    return;
  }

  const kibanaJsoncs = getKibanaJsonc(flags, log);

  for (let i = 0; i < kibanaJsoncs.length; ++i) {
    const kibanaJsonc = kibanaJsoncs[i];

    if (kibanaJsonc?.manifest) {
      const manifestPath = join(kibanaJsonc.directory, MANIFEST_FILE);
      log.info('Updating manifest: ', manifestPath);
      toSet.forEach((propValue) => {
        const [prop, value] = propValue.split('=');
        log.info(`Setting "${prop}": "${value}"`);
        set(kibanaJsonc.manifest, prop, value);
      });

      toUnset.forEach((prop) => {
        log.info(`Removing "${prop}"`);
        unset(kibanaJsonc.manifest, prop);
      });

      sanitiseManifest(kibanaJsonc);

      await writeFile(manifestPath, JSON.stringify(kibanaJsonc.manifest, null, 2));
      log.info('DONE');
    }
  }
};

const sanitiseManifest = (kibanaJsonc: Package) => {
  kibanaJsonc.manifest.owner = flatMap(kibanaJsonc.manifest.owner.map((owner) => owner.split(' ')));
};
