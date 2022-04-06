/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import loadJsonFile from 'load-json-file';

export interface KibanaPlatformPlugin {
  readonly directory: string;
  readonly manifestPath: string;
  readonly manifest: KibanaPlatformPluginManifest;
}

function isValidDepsDeclaration(input: unknown, type: string): string[] {
  if (typeof input === 'undefined') return [];
  if (Array.isArray(input) && input.every((i) => typeof i === 'string')) {
    return input;
  }
  throw new TypeError(`The "${type}" in plugin manifest should be an array of strings.`);
}

export interface KibanaPlatformPluginManifest {
  id: string;
  ui: boolean;
  server: boolean;
  kibanaVersion: string;
  version: string;
  owner: {
    // Internally, this should be a team name.
    name: string;
    // All internally owned plugins should have a github team specified that can be pinged in issues, or used to look up
    // members who can be asked questions regarding the plugin.
    githubTeam?: string;
  };
  // TODO: make required.
  description?: string;
  enableForAnonymousPages?: boolean;
  serviceFolders: readonly string[];
  requiredPlugins: readonly string[];
  optionalPlugins: readonly string[];
  requiredBundles: readonly string[];
  extraPublicDirs: readonly string[];
}

export function parseKibanaPlatformPlugin(manifestPath: string): KibanaPlatformPlugin {
  if (!Path.isAbsolute(manifestPath)) {
    throw new TypeError('expected new platform manifest path to be absolute');
  }

  const manifest: Partial<KibanaPlatformPluginManifest> = loadJsonFile.sync(manifestPath);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('expected new platform plugin manifest to be a JSON encoded object');
  }

  if (typeof manifest.id !== 'string') {
    throw new TypeError('expected new platform plugin manifest to have a string id');
  }

  if (typeof manifest.version !== 'string') {
    throw new TypeError('expected new platform plugin manifest to have a string version');
  }

  if (!manifest.owner || typeof manifest.owner.name !== 'string') {
    throw new TypeError(
      `Expected plugin ${manifest.id} manifest to have an owner with name specified (${manifestPath})`
    );
  }

  return {
    directory: Path.dirname(manifestPath),
    manifestPath,
    manifest: {
      ...manifest,

      ui: !!manifest.ui,
      server: !!manifest.server,
      id: manifest.id,
      version: manifest.version,
      kibanaVersion: manifest.kibanaVersion || manifest.version,
      serviceFolders: manifest.serviceFolders || [],
      owner: manifest.owner,
      description: manifest.description,
      enableForAnonymousPages: !!manifest.enableForAnonymousPages,
      requiredPlugins: isValidDepsDeclaration(manifest.requiredPlugins, 'requiredPlugins'),
      optionalPlugins: isValidDepsDeclaration(manifest.optionalPlugins, 'optionalPlugins'),
      requiredBundles: isValidDepsDeclaration(manifest.requiredBundles, 'requiredBundles'),
      extraPublicDirs: isValidDepsDeclaration(manifest.extraPublicDirs, 'extraPublicDirs'),
    },
  };
}
