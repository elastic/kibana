/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { flatMap, unset } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Flags } from '@kbn/dev-cli-runner';
import { type Package, getPackages, Jsonc } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { existsSync, readFileSync } from 'fs';

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

interface TsConfigObject {
  kbn_references: string[];
}

export const readTsConfig = async (directory: string): Promise<any | undefined> => {
  const tsConfigPath = join(directory, 'tsconfig.json');
  if (existsSync(tsConfigPath)) {
    const tsConfigString = await readFile(tsConfigPath);
    const tsConfig = Jsonc.parse(tsConfigString.toString()) as TsConfigObject;
    return tsConfig;
  }
};

export const writeTsConfig = async (directory: string, data: object) => {
  const tsConfigPath = join(directory, 'tsconfig.json');
  return await writeFile(tsConfigPath, JSON.stringify(data, null, 2));
};

export const dependsOn = (potentialDependency: Package, module: Package): boolean => {
  const tsConfigPath = join(potentialDependency.directory, 'tsconfig.json');
  if (existsSync(tsConfigPath)) {
    const tsConfigString = readFileSync(tsConfigPath);
    const tsConfig = Jsonc.parse(tsConfigString.toString()) as TsConfigObject;
    return tsConfig?.kbn_references?.includes(module.id);
  } else {
    return false;
  }
};

export const noDependants = (current: Package): boolean => {
  const modules = getPackages(REPO_ROOT);
  const dependants = modules.filter((module) => dependsOn(module, current));
  return dependants.length === 0;
};

export const checkDependants = (current: Package): boolean => {
  const modules = getPackages(REPO_ROOT);
  const dependants = modules.filter((module) => dependsOn(module, current));
  const solutionDependants = dependants
    .filter(
      (module) =>
        module.group === 'observability' || module.group === 'security' || module.group === 'search'
    )
    .map((module) => module.group);

  if (solutionDependants.length) {
    console.log(
      'Module',
      current.id,
      'has the following dependant(s)',
      dependants.map((module) => `${module.id} - ${module.group}/${module.visibility}`)
    );
  }
  return true;
  // dependants.length > 0 &&
  // dependants.every(
  //   (module) =>
  //     module.group !== 'observability' && module.group !== 'security' && module.group !== 'search'
  // ) &&
  // dependants.some(
  //   (module) =>
  //     module.group === 'observability' || module.group === 'security' || module.group === 'search'
  // )
  // dependants.some((module) => module.group === 'platform')
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
