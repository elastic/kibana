/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Simple parsed representation of a package.json file, validated
 * by `assertParsedPackageJson()` and extensible as needed in the future
 */
export interface ParsedPackageJson {
  /** The name of the package, usually `@kbn/`+something */
  name: string;
  /** "dependenices" property from package.json */
  dependencies?: Record<string, string>;
  /** "devDependenices" property from package.json */
  devDependencies?: Record<string, string>;
  /** Some kibana specific properties about this package */
  kibana?: {
    /** Is this package only intended for dev? */
    devOnly?: boolean;
  };
  /** Scripts defined in the package.json file */
  scripts?: {
    [key: string]: string | undefined;
  };
  /** All other fields in the package.json are typed as unknown as we don't care what they are */
  [key: string]: unknown;
}

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
  /**
   * The type of this package. Package types define how a package can and should
   * be used/built. Some package types also change the way that packages are
   * interpreted.
   */
  type: KibanaPackageType;
  /**
   * Module ID for this package. This must be globbally unique amoungst all
   * packages and should include the most important information about how this
   * package should be used. Avoid generic names to aid in disambiguation.
   */
  id: string;
  /**
   * Github handles for the people or teams responsible for this package.
   * These values will be used in the codeowners files for this package.
   */
  owner: string[];
  /**
   * A devOnly package can be used by other devOnly packages (and only
   * other devOnly packages) and will never be included in the distributable
   */
  devOnly?: boolean;
}

export interface PluginPackageManifest extends PackageManifestBaseFields {
  type: 'plugin-browser' | 'plugin-server';
  /**
   * Details about the plugin which is contained within this package.
   */
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
  /**
   * When a package is used by many other packages in the browser, or requires some
   * specific state in the module scope (though we highly recommend against this) you
   * can set `sharedBrowserBundle` to true so this package to load in a separate async
   * bundle request rather than being copied into the bundles of each package which
   * use it. (not yet implemented)
   */
  sharedBrowserBundle?: boolean;
}

export interface BasePackageManifest extends PackageManifestBaseFields {
  type: 'shared-server' | 'functional-tests' | 'test-helper' | 'shared-scss';
}

export type KibanaPackageManifest =
  | PluginPackageManifest
  | SharedBrowserPackageManifest
  | BasePackageManifest;
