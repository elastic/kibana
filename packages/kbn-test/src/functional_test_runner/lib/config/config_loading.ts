/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { defaultsDeep } from 'lodash';
import { createFlagError, createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import { FtrConfigProvider, GenericFtrProviderContext } from '../../public_types';
import { Config } from './config';
import { EsVersion } from '../es_version';
import { FTR_CONFIGS_MANIFEST_REL, FTR_CONFIGS_MANIFEST_PATHS } from './ftr_configs_manifest';

interface LoadSettingsOptions {
  path: string;
  settingOverrides: any;
  primary: boolean;
}

interface Journey {
  config: {
    isSkipped(): boolean;
  };
  testProvider(ctx: GenericFtrProviderContext<any, any>): void;
}

export type ConfigModule =
  | {
      type: 'config';
      path: string;
      provider: FtrConfigProvider;
    }
  | {
      type: 'journey';
      path: string;
      provider: FtrConfigProvider;
      journey: Journey;
    };

async function getConfigModule({
  path,
  primary,
}: {
  path: string;
  primary: boolean;
}): Promise<ConfigModule> {
  let resolvedPath;
  try {
    resolvedPath = require.resolve(path);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw createFlagError(`Unable to find config file [${path}]`);
    }
    throw error;
  }

  if (
    primary &&
    !FTR_CONFIGS_MANIFEST_PATHS.includes(resolvedPath) &&
    !resolvedPath.includes(`${Path.sep}__fixtures__${Path.sep}`)
  ) {
    const rel = Path.relative(REPO_ROOT, resolvedPath);
    throw createFlagError(
      `Refusing to load FTR Config at [${rel}] which is not listed in [${FTR_CONFIGS_MANIFEST_REL}]. All FTR Config files must be listed there, use the "enabled" key if the FTR Config should be run on automatically on PR CI, or the "disabled" key if it is run manually or by a special job.`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const exports = require(resolvedPath);
  const defaultExport = exports.__esModule ? exports.default : exports;
  if (typeof defaultExport === 'function') {
    return {
      type: 'config',
      path: resolvedPath,
      provider: defaultExport,
    };
  }

  const { journey } = exports;
  if (
    !journey.constructor ||
    typeof journey.constructor !== 'function' ||
    journey.constructor.name !== 'Journey'
  ) {
    const rel = Path.relative(process.cwd(), resolvedPath);
    throw createFailError(
      `"journey" export in journey at [${rel}] is not a valid instance of Journey`
    );
  }

  return {
    type: 'journey',
    path: resolvedPath,
    provider: journey.constructor.convertToFtrConfigProvider(journey),
    journey,
  };
}

const cache = new WeakMap<FtrConfigProvider, Promise<any>>();
async function executeConfigModule(
  log: ToolingLog,
  esVersion: EsVersion,
  options: LoadSettingsOptions,
  module: ConfigModule
): Promise<any> {
  const cached = cache.get(module.provider);

  if (cached) {
    return defaultsDeep({}, options.settingOverrides, await cached);
  }

  log.debug(`Loading config file from ${Path.relative(process.cwd(), options.path)}`);
  const settings: Promise<any> = module.provider({
    log,
    esVersion,
    async readConfigFile(p: string) {
      const childModule = await getConfigModule({
        primary: false,
        path: p,
      });

      return new Config({
        settings: await executeConfigModule(
          log,
          esVersion,
          {
            path: childModule.path,
            settingOverrides: {},
            primary: false,
          },
          childModule
        ),
        primary: false,
        path: p,
        module: childModule,
      });
    },
  });

  cache.set(module.provider, Promise.resolve(settings));

  return defaultsDeep({}, options.settingOverrides, await settings);
}

const ident = <T>(vars: T) => vars;

export async function readConfigFile(
  log: ToolingLog,
  esVersion: EsVersion,
  path: string,
  settingOverrides: any = {},
  extendSettings: (vars: any) => any = ident
) {
  const module = await getConfigModule({
    primary: true,
    path,
  });

  return new Config({
    settings: extendSettings(
      await executeConfigModule(
        log,
        esVersion,
        {
          path,
          settingOverrides,
          primary: true,
        },
        module
      )
    ),
    primary: true,
    path,
    module,
  });
}
