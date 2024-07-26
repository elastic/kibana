/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ClassDeclaration, Project } from 'ts-morph';
import {
  PLUGIN_LAYERS,
  PLUGIN_LIFECYCLES,
  PLUGIN_REQUIREMENTS,
  MANIFEST_STATES,
  DEPENDENCY_STATES,
  PLUGIN_STATES,
  SOURCE_OF_TYPE,
  MANIFEST_REQUIREMENTS,
} from './const';

/** An enumeration of plugin classes within a single plugin.  */
export type PluginLayer = (typeof PLUGIN_LAYERS)[number];

/** An enumeration of dependency requirements for a plugin. */
export type PluginRequirement = (typeof PLUGIN_REQUIREMENTS)[number];

/** An enumeration of lifecycles a plugin should implement. */
export type PluginLifecycle = (typeof PLUGIN_LIFECYCLES)[number];

/** An enumeration of manifest requirement states for a plugin dependency. */
export type ManifestRequirement = (typeof MANIFEST_REQUIREMENTS)[number];

/** An enumeration of derived manifest states for a plugin dependency. */
export type ManifestState = (typeof MANIFEST_STATES)[number];

/** An enumeration of derived plugin states for a dependency. */
export type PluginState = (typeof PLUGIN_STATES)[number];

/** An enumeration of derived dependency states. */
export type DependencyState = (typeof DEPENDENCY_STATES)[number];

/** An enumeration of where a type could be derived from a plugin class. */
export type SourceOfType = (typeof SOURCE_OF_TYPE)[number];

/** Information about a given plugin. */
export interface PluginInfo {
  /** The unique Kibana identifier for the plugin. */
  name: string;
  /**
   * The `ts-morph` project for the plugin; this is expensive to create, so it is
   * also stored here.
   */
  project: Project;
  /** Class Declarations from `ts-morph` for the plugin layers. */
  classes: {
    /** Class Declarations from `ts-morph` for the `client` plugin layer. */
    client: ClassDeclaration | null;
    /** Class Declarations from `ts-morph` for the `server` plugin layer. */
    server: ClassDeclaration | null;
  };
  /** Dependencies and their states for the plugin. */
  dependencies: {
    /** Dependencies derived from the manifest. */
    manifest: ManifestDependencies;
    /** Dependencies derived from the plugin code. */
    plugin: PluginDependencies;
  } & All;
}

// Convenience type to include an `all` field of combined, unique dependency names
// for any given subset.
interface All {
  all: Readonly<string[]>;
}

/** Dependencies organized by whether or not they are required. */
export type Dependencies = {
  [requirement in PluginRequirement]: Readonly<string[]>;
} & {
  /** From where the dependencies were derived-- e.g. a type or instance method. */
  source: SourceOfType;
  /** The name of the type, if any. */
  typeName: string | null;
} & All;

/** Dependencies organized by plugin lifecycle. */
export type Lifecycle = {
  [lifecycle in PluginLifecycle]: Dependencies | null;
} & All;

/** Dependencies organized by plugin layer. */
export type PluginDependencies = {
  [layer in PluginLayer]: Lifecycle;
} & All;

/** Dependencies organized by manifest requirement. */
export type ManifestDependencies = {
  [requirement in ManifestRequirement]: Readonly<string[]>;
} & All;

// The hierarchical representation of a plugin's dependencies:
// plugin layer -> lifecycle -> requirement -> dependency info
type PluginStatus = {
  [layer in PluginLayer]: {
    [lifecycle in PluginLifecycle]: {
      typeName: string;
      source: SourceOfType;
      pluginState: PluginState;
    };
  };
};

/** A map of dependencies and their status organized by name.  */
export interface PluginStatuses {
  [pluginId: string]: PluginStatus & {
    status: DependencyState;
    manifestState: ManifestState;
  };
}
