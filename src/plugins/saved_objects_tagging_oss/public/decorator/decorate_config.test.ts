/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { extractTagReferencesMock, injectTagReferencesMock } from './decorate_config.test.mocks';

import { SavedObjectConfig } from '../../../saved_objects/public';
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
