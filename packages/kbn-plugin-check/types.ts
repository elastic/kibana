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

export type PluginLayer = typeof PLUGIN_LAYERS[number];
export type PluginRequirement = typeof PLUGIN_REQUIREMENTS[number];
export type PluginLifecycle = typeof PLUGIN_LIFECYCLES[number];
export type ManifestRequirement = typeof MANIFEST_REQUIREMENTS[number];

export type ManifestState = typeof MANIFEST_STATES[number];
export type PluginState = typeof PLUGIN_STATES[number];
export type DependencyState = typeof DEPENDENCY_STATES[number];

export type SourceOfType = typeof SOURCE_OF_TYPE[number];

export interface PluginInfo {
  name: string;
  project: Project;
  classes: {
    client: ClassDeclaration | null;
    server: ClassDeclaration | null;
  };
  dependencies: {
    manifest: ManifestDependencies;
    plugin: PluginDependencies;
  } & All;
}

interface All {
  all: Readonly<string[]>;
}

export type Dependencies = {
  [requirement in PluginRequirement]: Readonly<string[]>;
} & {
  source: SourceOfType;
  typeName: string | null;
} & All;

export type Lifecycle = {
  [lifecycle in PluginLifecycle]: Dependencies | null;
} & All;

export type PluginDependencies = {
  [layer in PluginLayer]: Lifecycle;
} & All;

export type ManifestDependencies = {
  [requirement in ManifestRequirement]: Readonly<string[]>;
} & All;

type PluginStatus = {
  [layer in PluginLayer]: {
    [lifecycle in PluginLifecycle]: {
      typeName: string;
      source: SourceOfType;
      pluginState: PluginState;
    };
  };
};

export interface PluginStatuses {
  [pluginId: string]: PluginStatus & {
    status: DependencyState;
    manifestState: ManifestState;
  };
}
