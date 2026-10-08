/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/config-mocks';
import { savedObjectsConfig } from './saved_objects_config';

const deprecationContext = configDeprecationsMock.createContext();

const applySavedObjectsDeprecations = (settings: Record<string, unknown> = {}) => {
  const deprecations = savedObjectsConfig.deprecations?.(configDeprecationFactory) ?? [];
  const deprecationMessages: string[] = [];
  const { config: migrated } = applyDeprecations(
    { savedObjects: settings },
    deprecations.map((deprecation) => ({
      deprecation,
      path: 'savedObjects',
      context: deprecationContext,
    })),
    () =>
      ({ message }) => {
        deprecationMessages.push(message);
      }
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('savedObjects config', () => {
  it('removes the unused allowHttpApiAccess setting and logs a deprecation', () => {
    const { messages, migrated } = applySavedObjectsDeprecations({
      allowHttpApiAccess: true,
      maxImportExportSize: 100,
    });

    expect(migrated).toEqual({ savedObjects: { maxImportExportSize: 100 } });
    expect(messages).toEqual([
      'You no longer need to configure "savedObjects.allowHttpApiAccess".',
    ]);
  });

  it('does not log a deprecation when allowHttpApiAccess is not set', () => {
    const { messages } = applySavedObjectsDeprecations({ maxImportExportSize: 100 });

    expect(messages).toEqual([]);
  });
});
