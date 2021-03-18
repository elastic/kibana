/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { parseConfigFileTextToJson } from 'typescript';

// yes, this is just `any`, but I'm hoping that TypeScript will give us some help here eventually
type TsConfigFile = ReturnType<typeof parseConfigFileTextToJson>['config'];

export function parseTsConfig(tsConfigPath: string): TsConfigFile {
  const { error, config } = parseConfigFileTextToJson(
    tsConfigPath,
    Fs.readFileSync(tsConfigPath, 'utf8')
  );

  if (error) {
    throw error;
  }

  return config;
}

export function getOutputsDeep(tsConfigPaths: string[]) {
  const tsConfigs = new Map<string, TsConfigFile>();

  const read = (path: string) => {
    const cached = tsConfigs.get(path);
    if (cached) {
      return cached;
    }

    const config = parseTsConfig(path);
    tsConfigs.set(path, config);
    return config;
  };

  const outputDirs: string[] = [];
  const seen = new Set<TsConfigFile>();

  const traverse = (path: string) => {
    const config = read(path);
    if (seen.has(config)) {
      return;
    }
    seen.add(config);

    const dirname = Path.dirname(path);
    const relativeOutDir: string | undefined = config.compilerOptions?.outDir;
    if (relativeOutDir) {
      outputDirs.push(Path.resolve(dirname, relativeOutDir));
    }

    const refs: undefined | Array<{ path: string }> = config.references;
    for (const ref of refs ?? []) {
      traverse(Path.resolve(dirname, ref.path));
    }
  };

  for (const path of tsConfigPaths) {
    traverse(path);
  }

  return outputDirs;
}
