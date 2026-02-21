/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExtensionPointToken, ServiceToken } from '@kbn/core-di';

const PLUGIN_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const LOCAL_NAME_PATTERN = /^[A-Z][a-zA-Z0-9]*$/;
const TOKEN_REGISTRY_KEY = '__kbnPluginDiTokenRegistry';

type TokenKind = 'service' | 'extensionPoint';

interface TokenDefinition {
  kind: TokenKind;
  source?: string;
}

interface TokenRegistry {
  definitions: Map<string, TokenDefinition>;
}

/**
 * A factory scoped to a single plugin that mints typed DI tokens.
 *
 * Obtain an instance via {@link createTokenFactory}.
 * @public
 */
export interface TokenFactory {
  /**
   * Creates an {@link ExtensionPointToken} for a plugin extension point.
   *
   * The resulting token is globally unique and registered under
   * `<pluginId>.<name>` in the dev-mode registry.
   *
   * @param name - PascalCase local name for the extension point (e.g. `"MyExtensionPoint"`).
   * @returns A typed {@link ExtensionPointToken} backed by `Symbol.for('<pluginId>.<name>')`.
   */
  extensionPoint<T>(name: string): ExtensionPointToken<T>;

  /**
   * Creates a {@link ServiceToken} for a plugin service.
   *
   * The resulting token is globally unique and registered under
   * `<pluginId>.<name>` in the dev-mode registry.
   *
   * @param name - PascalCase local name for the service (e.g. `"MyService"`).
   * @returns A typed {@link ServiceToken} backed by `Symbol.for('<pluginId>.<name>')`.
   */
  service<T>(name: string): ServiceToken<T>;
}

const getRegistry = (): TokenRegistry => {
  const globalScope = globalThis as typeof globalThis & {
    __kbnPluginDiTokenRegistry?: TokenRegistry;
  };

  if (!globalScope[TOKEN_REGISTRY_KEY]) {
    globalScope[TOKEN_REGISTRY_KEY] = {
      definitions: new Map(),
    };
  }

  return globalScope[TOKEN_REGISTRY_KEY]!;
};

const isProduction = () =>
  typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';

const getDefinitionSource = (): string | undefined =>
  new Error().stack
    ?.split('\n')
    .slice(1)
    .map((line) => line.trim())
    .join('\n');

const assertPluginId = (pluginId: string) => {
  if (!PLUGIN_ID_PATTERN.test(pluginId)) {
    throw new Error(
      `createTokenFactory("${pluginId}") must use a camelCase plugin id (for example "myPlugin").`
    );
  }
};

const assertLocalName = (name: string) => {
  if (name.includes('.')) {
    throw new Error(
      `createTokenFactory name "${name}" must be a local PascalCase name without dots.`
    );
  }

  if (!LOCAL_NAME_PATTERN.test(name)) {
    throw new Error(
      `createTokenFactory name "${name}" must use PascalCase (for example "MyService").`
    );
  }
};

// Dev-only duplicate-definition guard. Identity is heuristic: it keys off a
// process-global registry and compares captured stack strings, so it catches
// common mistakes but is not authoritative. Skipped entirely in production.
const registerToken = (fullName: string, kind: TokenKind) => {
  if (isProduction()) {
    return;
  }

  const registry = getRegistry().definitions;
  const source = getDefinitionSource();
  const existing = registry.get(fullName);

  if (!existing) {
    registry.set(fullName, { kind, source });
    return;
  }

  if (existing.kind !== kind) {
    throw new Error(
      `Cross-plugin token "${fullName}" is defined as both a ${existing.kind} and an ${kind}.`
    );
  }

  if (existing.source && source && existing.source !== source) {
    throw new Error(
      `Cross-plugin token "${fullName}" is defined more than once. Reuse the exported token instead of redefining it.`
    );
  }
};

const createToken = <T>(
  pluginId: string,
  name: string,
  kind: TokenKind
): ExtensionPointToken<T> | ServiceToken<T> => {
  assertPluginId(pluginId);
  assertLocalName(name);

  const fullName = `${pluginId}.${name}`;
  registerToken(fullName, kind);

  return Symbol.for(fullName) as ExtensionPointToken<T> | ServiceToken<T>;
};

/**
 * Creates a {@link TokenFactory} scoped to `pluginId`.
 *
 * Each token is backed by a global `Symbol.for('<pluginId>.<name>')`. The string
 * key is a deliberate cross-package protocol: producers and consumers in
 * different packages resolve the same well-known symbol without importing a
 * shared binding, so neither side needs a hard dependency on the other.
 *
 * In non-production environments the factory runs a best-effort guard that each
 * fully-qualified token is defined only once and that service and
 * extension-point tokens are never mixed for the same name. The guard is a
 * dev-only heuristic (see {@link registerToken}); it is not a runtime guarantee.
 *
 * @example
 * ```ts
 * // In a shared types package (e.g. `my-plugin-types`):
 * export const tokens = createTokenFactory('myPlugin');
 * export const MyServiceToken = tokens.service<MyService>('MyService');
 * export const MyExtensionPointToken = tokens.extensionPoint<MyExtensionPoint>('MyExtensionPoint');
 * ```
 *
 * @param pluginId - camelCase plugin identifier that prefixes every token name
 *   (e.g. `"myPlugin"`). Must match the pattern `[a-z][a-zA-Z0-9]*`.
 * @returns A {@link TokenFactory} whose methods mint tokens scoped to `pluginId`.
 * @public
 * @experimental
 */
export const createTokenFactory = (pluginId: string): TokenFactory => {
  assertPluginId(pluginId);

  return {
    extensionPoint: <T>(name: string) =>
      createToken<T>(pluginId, name, 'extensionPoint') as ExtensionPointToken<T>,
    service: <T>(name: string) => createToken<T>(pluginId, name, 'service') as ServiceToken<T>,
  };
};
