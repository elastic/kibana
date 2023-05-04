/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractTagReferencesMock, injectTagReferencesMock } from './decorate_config.test.mocks';

import { SavedObjectConfig } from '@kbn/saved-objects-plugin/public';
import { decorateConfig } from './decorate_config';

describe('decorateConfig', () => {
  afterEach(() => {
    extractTagReferencesMock.mockReset();
    injectTagReferencesMock.mockReset();
  });

  describe('mapping', () => {
    it('adds the `__tags` key to the config mapping', () => {
      const config: SavedObjectConfig = {
        mapping: {
          someText: 'text',
          someNum: 'number',
        },
      };

      decorateConfig(config);

      expect(config.mapping).toEqual({
        __tags: 'text',
        someText: 'text',
        someNum: 'number',
      });
    });

    it('adds mapping to the config if missing', () => {
      const config: SavedObjectConfig = {};

      decorateConfig(config);

      expect(config.mapping).toEqual({
        __tags: 'text',
      });
    });
  });

  describe('injectReferences', () => {
    it('decorates to only call `injectTagReferences` when not present on the config', () => {
      const config: SavedObjectConfig = {};

      decorateConfig(config);

      const object: any = Symbol('object');
      const references: any = Symbol('referebces');

      config.injectReferences!(object, references);

      expect(injectTagReferencesMock).toHaveBeenCalledTimes(1);
      expect(injectTagReferencesMock).toHaveBeenCalledWith(object, references);
    });

    it('decorates to call both functions when present on the config', () => {
      const initialInjectReferences = jest.fn();

      const config: SavedObjectConfig = {
        injectReferences: initialInjectReferences,
      };

      decorateConfig(config);

      const object: any = Symbol('object');
      const references: any = Symbol('references');

      config.injectReferences!(object, references);

      expect(initialInjectReferences).toHaveBeenCalledTimes(1);
      expect(initialInjectReferences).toHaveBeenCalledWith(object, references);

      expect(injectTagReferencesMock).toHaveBeenCalledTimes(1);
      expect(injectTagReferencesMock).toHaveBeenCalledWith(object, references);
    });
  });

  describe('extractReferences', () => {
    it('decorates to only call `extractTagReference` when not present on the config', () => {
      const config: SavedObjectConfig = {};

      decorateConfig(config);

      const params: any = Symbol('params');
      const expectedReturn = Symbol('return-from-extractTagReferences');

      extractTagReferencesMock.mockReturnValue(expectedReturn);

      const result = config.extractReferences!(params);

      expect(result).toBe(expectedReturn);

      expect(extractTagReferencesMock).toHaveBeenCalledTimes(1);
      expect(extractTagReferencesMock).toHaveBeenCalledWith(params);
    });

    it('decorates to call both functions in order when present on the config', () => {
      const initialExtractReferences = jest.fn();

      const config: SavedObjectConfig = {
        extractReferences: initialExtractReferences,
      };

      decorateConfig(config);

      const params: any = Symbol('initial-params');
      const initialReturn = Symbol('return-from-initial-extractReferences');
      const tagReturn = Symbol('return-from-extractTagReferences');

      initialExtractReferences.mockReturnValue(initialReturn);
      extractTagReferencesMock.mockReturnValue(tagReturn);

      const result = config.extractReferences!(params);

      expect(initialExtractReferences).toHaveBeenCalledTimes(1);
      expect(initialExtractReferences).toHaveBeenCalledWith(params);

      expect(extractTagReferencesMock).toHaveBeenCalledTimes(1);
      expect(extractTagReferencesMock).toHaveBeenCalledWith(initialReturn);

      expect(result).toBe(tagReturn);
    });
  });
});
