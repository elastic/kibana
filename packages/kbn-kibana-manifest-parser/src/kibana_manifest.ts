/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type KibanaPackageType =
  | 'plugin-browser'
  | 'plugin-server'
  | 'shared-browser'
  | 'shared-server'
  | 'shared-common'
  | 'shared-scss'
  | 'functional-tests'
  | 'test-helper';

interface PackageManifestBaseFields {
  type: KibanaPackageType;
  id: string;
  owner: string;
  typeDeps: string[];
  runtimeDeps: string[];
}

export interface PluginPackageManifest extends PackageManifestBaseFields {
  type: 'plugin-browser' | 'plugin-server';
  plugin: {
    id: string;
    configPath?: string[];
    requiredPlugins?: string[];
    optionalPlugins?: string[];
    description?: string;
    enabledOnAnonymousPages?: boolean;
    serviceFolders?: string[];
  };
}

export interface SharedBrowserPackageManifest extends PackageManifestBaseFields {
  type: 'shared-browser' | 'shared-common';
  sharedBrowserBundle?: boolean;
}

export interface BasePackageManifest extends PackageManifestBaseFields {
  type: 'shared-server' | 'functional-tests' | 'test-helper' | 'shared-scss';
}

export type KibanaPackageManifest =
  | PluginPackageManifest
  | SharedBrowserPackageManifest
  | BasePackageManifest;
