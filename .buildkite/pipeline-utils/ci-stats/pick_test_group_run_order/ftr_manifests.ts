/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'node:fs';
import { parse as loadYaml } from 'yaml';

import {
  serverless as serverlessFTRManifestPaths,
  stateful as statefulFTRManifestPaths,
} from '../../../ftr-manifests/ftr_configs_manifests.json';
import { type FTRTestChannel, ftrTestChannel, ftrTestChannels } from './test_channels';

export type FTRManifestFileEntry =
  | string
  | { [configPath: string]: { queue?: string; testChannels?: string[] } };

export interface FTRManifestFileData {
  disabled?: FTRManifestFileEntry[];
  enabled?: FTRManifestFileEntry[];
}

export interface FTRManifestEntry {
  path: string;
  queue: string;
  testChannels: Set<FTRTestChannel>;
  arch: string;
  domain: string;
  enabled: boolean;
}

export const ftrManifest: {
  default: {
    queue: string;
    channels: Set<string>;
  };
  paths: {
    stateful: string[];
    serverless: string[];
    all: string[];
  };
  entries: {
    fromFile(path: string): FTRManifestEntry[];
    all(): FTRManifestEntry[];
    enabled(): FTRManifestEntry[];
  };
} = {
  default: {
    queue: 'n2-4-spot',
    channels: new Set(['ci-on-commit']),
  },
  paths: {
    stateful: statefulFTRManifestPaths,
    serverless: serverlessFTRManifestPaths,
    all: [...statefulFTRManifestPaths, ...serverlessFTRManifestPaths],
  },
  entries: {
    fromFile(path: string) {
      const manifest = loadYaml(readFileSync(path, 'utf-8')) as FTRManifestFileData;
      const filenameMatch = path
        .toLowerCase()
        .match(/ftr_(?<domain>\w*)_(?<arch>\w*)_configs.ya?ml$/);

      if (filenameMatch === null) {
        throw new Error(
          `Invalid filename for FTR configs manifest: expected 'ftr_{domain}_{arch}_configs.y(a)ml' but got ${path}`
        );
      }

      const entries: FTRManifestEntry[] = [];

      const normalizeManifestFileEntry = (
        entry: FTRManifestFileEntry,
        enabled: boolean
      ): FTRManifestEntry => {
        if (typeof entry === 'string') {
          return {
            path: entry,
            queue: ftrManifest.default.queue,
            testChannels: ftrTestChannels.default,
            arch: filenameMatch.groups!.arch,
            domain: filenameMatch.groups!.domain,
            enabled,
          };
        }

        const configPath = Object.keys(entry)[0];
        const configSettings = entry[configPath];

        return {
          path: configPath,
          queue: configSettings.queue ?? ftrManifest.default.queue,
          testChannels:
            configSettings.testChannels === undefined
              ? ftrTestChannels.default
              : new Set(configSettings.testChannels.map(ftrTestChannel.fromString)),
          arch: filenameMatch.groups!.arch,
          domain: filenameMatch.groups!.domain,
          enabled,
        };
      };

      manifest.enabled?.forEach((entry) => {
        entries.push(normalizeManifestFileEntry(entry, true));
      });

      manifest.disabled?.forEach((entry) => {
        entries.push(normalizeManifestFileEntry(entry, false));
      });

      return entries;
    },
    all() {
      return ftrManifest.paths.all.flatMap(this.fromFile);
    },
    enabled() {
      return this.all().filter((entry) => entry.enabled);
    },
  },
};
