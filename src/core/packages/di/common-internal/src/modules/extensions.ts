/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container, ServiceIdentifier } from 'inversify';
import { createToken, type ExtensionPoint, type ExtensionService } from '@kbn/core-di';

/**
 * The plugin's `extensions.collect` hooks, run once after every plugin started and before any `OnExtensionsReady` hook.
 */
export const Collect = createToken<(container: Container) => void>('core.di.Collect');

/**
 * One contribution to an extension point, built on `resolve` in the scope of the plugin that contributed it.
 */
export interface Contribution<T> {
  plugin: string;
  resolve(): T;
}

/**
 * Lists every contribution to an extension point across all plugins, in plugin order.
 */
export type ContributionsResolver = <T>(point: ExtensionPoint<T>) => Array<Contribution<T>>;

/**
 * Resolves every contribution to an extension point.
 */
export const Contributions = createToken<ContributionsResolver>('core.di.Contributions');

/**
 * Records one `extensions.contribute` call in the contributing plugin's container: the point and the private slot bound to the value.
 */
export const ExtensionContribution = createToken<{
  point: ExtensionPoint<unknown>;
  slot: ServiceIdentifier;
}>('core.di.ExtensionContribution');

const getMessage = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);

const build = <T>(
  { description: id }: ExtensionPoint<T>,
  { plugin, resolve }: Contribution<T>
): T => {
  try {
    return resolve();
  } catch (reason) {
    throw new Error(
      `Failed to build the "${id}" contribution from plugin "${plugin}": ${getMessage(reason)}`,
      { cause: reason }
    );
  }
};

/**
 * Creates the extension service over the contributions the resolver lists.
 */
export const createExtensionService = (
  getContributions: ContributionsResolver
): ExtensionService => ({
  get: (point) => {
    const contributions = getContributions(point);
    if (contributions.length > 1) {
      const plugins = contributions.map(({ plugin }) => `"${plugin}"`).join(', ');
      throw new Error(
        `Cannot get extension point "${point.description}" because it has ${contributions.length} contributions, from plugins ${plugins}. Use getAll or collect instead.`
      );
    }

    return contributions.length ? build(point, contributions[0]) : undefined;
  },
  getAll: (point) => getContributions(point).map((contribution) => build(point, contribution)),
});
