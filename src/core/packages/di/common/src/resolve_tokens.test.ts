/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, injectable } from 'inversify';
import type { ExtensionPointToken } from './create_token';
import { HostedExtensionPoint } from './plugin_markers';
import { getExtensions, getService } from './resolve_tokens';

describe('resolve_tokens', () => {
  describe('getService', () => {
    it('supports local service identifiers', () => {
      @injectable()
      class LocalService {
        public readonly value = 'local-service';
      }

      const container = new Container({ defaultScope: 'Singleton' });
      container.bind(LocalService).toSelf();

      expect(getService(container, LocalService).value).toBe('local-service');
    });
  });

  describe('getExtensions', () => {
    const ExtensionPoint = Symbol.for('test.HostedPoint') as ExtensionPointToken<string>;

    it('returns an empty array when the extension point is hosted with no contributions', () => {
      const container = new Container({ defaultScope: 'Singleton' });
      container.bind(HostedExtensionPoint).toConstantValue(ExtensionPoint);

      expect(getExtensions(container, ExtensionPoint)).toEqual([]);
    });

    it('returns all contributions when they exist', () => {
      const container = new Container({ defaultScope: 'Singleton' });
      container.bind(HostedExtensionPoint).toConstantValue(ExtensionPoint);
      container.bind(ExtensionPoint).toConstantValue('one');
      container.bind(ExtensionPoint).toConstantValue('two');

      expect(getExtensions(container, ExtensionPoint)).toEqual(['one', 'two']);
    });
  });
});
