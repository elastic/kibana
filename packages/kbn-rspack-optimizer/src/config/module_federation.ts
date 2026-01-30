/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModuleFederationPluginOptions } from '@rspack/core';
import type { PluginEntry } from '../types';

/**
 * Shared dependencies configuration for Module Federation
 * 
 * These are loaded ONCE and shared across all plugins at runtime.
 * No DLL, no externals bundle, no duplication.
 */
export function getSharedDependencies(): ModuleFederationPluginOptions['shared'] {
  return {
    // React ecosystem - MUST be singletons
    react: {
      singleton: true,
      requiredVersion: '^18.0.0',
      eager: false, // Lazy load - first plugin that needs it loads it
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.0.0',
    },
    'react-dom/client': {
      singleton: true,
      requiredVersion: '^18.0.0',
    },
    'react-router': {
      singleton: true,
      requiredVersion: '^6.0.0',
    },
    'react-router-dom': {
      singleton: true,
      requiredVersion: '^6.0.0',
    },

    // Styling - singletons to prevent style conflicts
    '@emotion/react': {
      singleton: true,
    },
    '@emotion/cache': {
      singleton: true,
    },
    'styled-components': {
      singleton: true,
    },

    // State management - singletons
    '@reduxjs/toolkit': {
      singleton: true,
    },
    'react-redux': {
      singleton: true,
    },
    redux: {
      singleton: true,
    },
    immer: {
      singleton: true,
    },
    reselect: {
      singleton: true,
    },

    // Observables
    rxjs: {
      singleton: true,
      requiredVersion: '^7.0.0',
    },

    // EUI - singleton for theme consistency
    '@elastic/eui': {
      singleton: true,
      requiredVersion: '^94.0.0',
    },
    '@elastic/eui-theme-borealis': {
      singleton: true,
    },
    '@elastic/charts': {
      singleton: true,
    },

    // Utilities - can be shared without singleton
    lodash: {
      singleton: true, // Singleton to save memory
    },
    'lodash/fp': {
      singleton: true,
    },
    moment: {
      singleton: true, // Singleton - has global state (locale)
    },
    'moment-timezone': {
      singleton: true,
    },
    classnames: {},
    uuid: {},
    tslib: {},
    history: {
      singleton: true,
    },

    // fp-ts / io-ts
    'fp-ts': {},
    'io-ts': {},

    // Kibana packages - these should be shared across plugins
    '@kbn/i18n': {
      singleton: true, // Has global state (locale)
    },
    '@kbn/i18n-react': {
      singleton: true,
    },
    '@kbn/std': {},
    '@kbn/es-query': {},
    '@kbn/datemath': {},
    '@kbn/analytics': {
      singleton: true,
    },
    '@kbn/rison': {},
    '@kbn/safer-lodash-set': {},

    // React Query
    '@tanstack/react-query': {
      singleton: true,
    },

    // DnD
    '@hello-pangea/dnd': {
      singleton: true,
    },

    // Monaco
    '@kbn/monaco': {
      singleton: true,
    },
    'monaco-editor': {
      singleton: true,
    },

    // jQuery (legacy)
    jquery: {
      singleton: true,
    },
  };
}

/**
 * Create Module Federation config for the host (core) application
 */
export function createHostMFConfig(plugins: PluginEntry[]): ModuleFederationPluginOptions {
  // Build remotes configuration - each plugin is a remote
  const remotes: Record<string, string> = {};

  for (const plugin of plugins) {
    if (plugin.type === 'plugin') {
      // Remote URL will be determined at runtime based on plugin location
      // Format: name@[publicPath]/remoteEntry.js
      remotes[`plugin_${sanitizeName(plugin.id)}`] = `plugin_${sanitizeName(plugin.id)}@dynamic`;
    }
  }

  return {
    name: 'kibana_host',
    filename: 'remoteEntry.js',

    // Host exposes core APIs - path is relative to context (src/core)
    exposes: {
      './public': './public/index.ts',
    },

    // Load plugins as remotes
    remotes,

    // Shared dependencies - loaded once, shared everywhere
    shared: getSharedDependencies(),

    // Runtime configuration
    runtime: 'kibana-mf-runtime',
    shareScope: 'kibana',
  };
}

/**
 * Create Module Federation config for a plugin (remote)
 */
export function createPluginMFConfig(plugin: PluginEntry): ModuleFederationPluginOptions {
  // Build exposes configuration - what this plugin provides
  // Paths are relative to context (plugin directory)
  const exposes: Record<string, string> = {};

  for (const target of plugin.targets) {
    const exposePath = target === 'public' ? '' : `/${target}`;
    exposes[`.${exposePath || '/public'}`] = `./${target}/index.ts`;
  }

  // Build remotes configuration - what plugins this depends on
  const remotes: Record<string, string> = {};

  for (const depId of plugin.requiredPlugins) {
    remotes[`plugin_${sanitizeName(depId)}`] = `plugin_${sanitizeName(depId)}@dynamic`;
  }

  // Core is always a remote dependency
  remotes['kibana_host'] = 'kibana_host@dynamic';

  return {
    name: `plugin_${sanitizeName(plugin.id)}`,
    filename: 'remoteEntry.js',

    // What this plugin exposes
    exposes,

    // What this plugin needs from other plugins
    remotes,

    // Shared dependencies
    shared: getSharedDependencies(),

    // Runtime configuration
    runtime: false, // Use host's runtime
    shareScope: 'kibana',
  };
}

/**
 * Sanitize plugin name for use as MF module name
 */
function sanitizeName(name: string): string {
  return name.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}
