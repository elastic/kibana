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

import { ConfigDeprecationLogger } from './types';
import { configDeprecationFactory } from './deprecation_factory';

describe('DeprecationFactory', () => {
  const { rename, unused, renameFromRoot, unusedFromRoot } = configDeprecationFactory;

  let deprecationMessages: string[];
  const logger: ConfigDeprecationLogger = msg => deprecationMessages.push(msg);

  beforeEach(() => {
    deprecationMessages = [];
  });

  describe('rename', () => {
    it('moves the property to rename and logs a warning if old property exist and new one does not', () => {
      const rawConfig = {
        myplugin: {
          deprecated: 'toberenamed',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = rename('deprecated', 'renamed')(rawConfig, 'myplugin', logger);
      expect(processed).toEqual({
        myplugin: {
          renamed: 'toberenamed',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\"",
        ]
      `);
    });
    it('does not alter config and does not log if old property is not present', () => {
      const rawConfig = {
        myplugin: {
          new: 'new',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = rename('deprecated', 'new')(rawConfig, 'myplugin', logger);
      expect(processed).toEqual({
        myplugin: {
          new: 'new',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages.length).toEqual(0);
    });
    it('handles nested keys', () => {
      const rawConfig = {
        myplugin: {
          oldsection: {
            deprecated: 'toberenamed',
          },
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = rename('oldsection.deprecated', 'newsection.renamed')(
        rawConfig,
        'myplugin',
        logger
      );
      expect(processed).toEqual({
        myplugin: {
          oldsection: {},
          newsection: {
            renamed: 'toberenamed',
          },
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "\\"myplugin.oldsection.deprecated\\" is deprecated and has been replaced by \\"myplugin.newsection.renamed\\"",
        ]
      `);
    });
    it('remove the old property but does not overrides the new one if they both exist, and logs a specific message', () => {
      const rawConfig = {
        myplugin: {
          deprecated: 'deprecated',
          renamed: 'renamed',
        },
      };
      const processed = rename('deprecated', 'renamed')(rawConfig, 'myplugin', logger);
      expect(processed).toEqual({
        myplugin: {
          renamed: 'renamed',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\". However both key are present, ignoring \\"myplugin.deprecated\\"",
        ]
      `);
    });
  });

  describe('renameFromRoot', () => {
    it('moves the property from root and logs a warning if old property exist and new one does not', () => {
      const rawConfig = {
        myplugin: {
          deprecated: 'toberenamed',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = renameFromRoot('myplugin.deprecated', 'myplugin.renamed')(
        rawConfig,
        'does-not-matter',
        logger
      );
      expect(processed).toEqual({
        myplugin: {
          renamed: 'toberenamed',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\"",
        ]
      `);
    });

    it('can move a property to a different namespace', () => {
      const rawConfig = {
        oldplugin: {
          deprecated: 'toberenamed',
          valid: 'valid',
        },
        newplugin: {
          property: 'value',
        },
      };
      const processed = renameFromRoot('oldplugin.deprecated', 'newplugin.renamed')(
        rawConfig,
        'does-not-matter',
        logger
      );
      expect(processed).toEqual({
        oldplugin: {
          valid: 'valid',
        },
        newplugin: {
          renamed: 'toberenamed',
          property: 'value',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "\\"oldplugin.deprecated\\" is deprecated and has been replaced by \\"newplugin.renamed\\"",
        ]
      `);
    });

    it('does not alter config and does not log if old property is not present', () => {
      const rawConfig = {
        myplugin: {
          new: 'new',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = renameFromRoot('myplugin.deprecated', 'myplugin.new')(
        rawConfig,
        'does-not-matter',
        logger
      );
      expect(processed).toEqual({
        myplugin: {
          new: 'new',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages.length).toEqual(0);
    });

    it('remove the old property but does not overrides the new one if they both exist, and logs a specific message', () => {
      const rawConfig = {
        myplugin: {
          deprecated: 'deprecated',
          renamed: 'renamed',
        },
      };
      const processed = renameFromRoot('myplugin.deprecated', 'myplugin.renamed')(
        rawConfig,
        'does-not-matter',
        logger
      );
      expect(processed).toEqual({
        myplugin: {
          renamed: 'renamed',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\". However both key are present, ignoring \\"myplugin.deprecated\\"",
        ]
      `);
    });
  });

  describe('unused', () => {
    it('removes the unused property from the config and logs a warning is present', () => {
      const rawConfig = {
        myplugin: {
          deprecated: 'deprecated',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = unused('deprecated')(rawConfig, 'myplugin', logger);
      expect(processed).toEqual({
        myplugin: {
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "myplugin.deprecated is deprecated and is no longer used",
        ]
      `);
    });

    it('handles deeply nested keys', () => {
      const rawConfig = {
        myplugin: {
          section: {
            deprecated: 'deprecated',
          },
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = unused('section.deprecated')(rawConfig, 'myplugin', logger);
      expect(processed).toEqual({
        myplugin: {
          valid: 'valid',
          section: {},
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "myplugin.section.deprecated is deprecated and is no longer used",
        ]
      `);
    });

    it('does not alter config and does not log if unused property is not present', () => {
      const rawConfig = {
        myplugin: {
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = unused('deprecated')(rawConfig, 'myplugin', logger);
      expect(processed).toEqual({
        myplugin: {
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages.length).toEqual(0);
    });
  });

  describe('unusedFromRoot', () => {
    it('removes the unused property from the root config and logs a warning is present', () => {
      const rawConfig = {
        myplugin: {
          deprecated: 'deprecated',
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = unusedFromRoot('myplugin.deprecated')(rawConfig, 'does-not-matter', logger);
      expect(processed).toEqual({
        myplugin: {
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages).toMatchInlineSnapshot(`
        Array [
          "myplugin.deprecated is deprecated and is no longer used",
        ]
      `);
    });

    it('does not alter config and does not log if unused property is not present', () => {
      const rawConfig = {
        myplugin: {
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      };
      const processed = unusedFromRoot('myplugin.deprecated')(rawConfig, 'does-not-matter', logger);
      expect(processed).toEqual({
        myplugin: {
          valid: 'valid',
        },
        someOtherPlugin: {
          property: 'value',
        },
      });
      expect(deprecationMessages.length).toEqual(0);
    });
  });
});
