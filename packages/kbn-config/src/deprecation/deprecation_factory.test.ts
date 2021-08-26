/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeprecatedConfigDetails } from './types';
import { configDeprecationFactory } from './deprecation_factory';

describe('DeprecationFactory', () => {
  const { rename, unused, renameFromRoot, unusedFromRoot } = configDeprecationFactory;

  const addDeprecation = jest.fn<void, [DeprecatedConfigDetails]>();

  beforeEach(() => {
    addDeprecation.mockClear();
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
      const commands = rename('deprecated', 'renamed')(rawConfig, 'myplugin', addDeprecation);
      expect(commands).toEqual({
        set: [
          {
            path: 'myplugin.renamed',
            value: 'toberenamed',
          },
        ],
        unset: [{ path: 'myplugin.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Replace \\"myplugin.deprecated\\" with \\"myplugin.renamed\\" in the Kibana config file, CLI flag, or environment variable (in Docker only).",
                ],
              },
              "message": "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\"",
            },
          ],
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
      const commands = rename('deprecated', 'new')(rawConfig, 'myplugin', addDeprecation);
      expect(commands).toBeUndefined();
      expect(addDeprecation).toHaveBeenCalledTimes(0);
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
      const commands = rename('oldsection.deprecated', 'newsection.renamed')(
        rawConfig,
        'myplugin',
        addDeprecation
      );
      expect(commands).toEqual({
        set: [
          {
            path: 'myplugin.newsection.renamed',
            value: 'toberenamed',
          },
        ],
        unset: [{ path: 'myplugin.oldsection.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Replace \\"myplugin.oldsection.deprecated\\" with \\"myplugin.newsection.renamed\\" in the Kibana config file, CLI flag, or environment variable (in Docker only).",
                ],
              },
              "message": "\\"myplugin.oldsection.deprecated\\" is deprecated and has been replaced by \\"myplugin.newsection.renamed\\"",
            },
          ],
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
      const commands = rename('deprecated', 'renamed')(rawConfig, 'myplugin', addDeprecation);
      expect(commands).toEqual({
        unset: [{ path: 'myplugin.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Make sure \\"myplugin.renamed\\" contains the correct value in the config file, CLI flag, or environment variable (in Docker only).",
                  "Remove \\"myplugin.deprecated\\" from the config.",
                ],
              },
              "message": "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\". However both key are present, ignoring \\"myplugin.deprecated\\"",
            },
          ],
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
      const commands = renameFromRoot('myplugin.deprecated', 'myplugin.renamed')(
        rawConfig,
        'does-not-matter',
        addDeprecation
      );
      expect(commands).toEqual({
        set: [
          {
            path: 'myplugin.renamed',
            value: 'toberenamed',
          },
        ],
        unset: [{ path: 'myplugin.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Replace \\"myplugin.deprecated\\" with \\"myplugin.renamed\\" in the Kibana config file, CLI flag, or environment variable (in Docker only).",
                ],
              },
              "message": "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\"",
            },
          ],
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
      const commands = renameFromRoot('oldplugin.deprecated', 'newplugin.renamed')(
        rawConfig,
        'does-not-matter',
        addDeprecation
      );
      expect(commands).toEqual({
        set: [
          {
            path: 'newplugin.renamed',
            value: 'toberenamed',
          },
        ],
        unset: [{ path: 'oldplugin.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Replace \\"oldplugin.deprecated\\" with \\"newplugin.renamed\\" in the Kibana config file, CLI flag, or environment variable (in Docker only).",
                ],
              },
              "message": "\\"oldplugin.deprecated\\" is deprecated and has been replaced by \\"newplugin.renamed\\"",
            },
          ],
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
      const commands = renameFromRoot('myplugin.deprecated', 'myplugin.new')(
        rawConfig,
        'does-not-matter',
        addDeprecation
      );
      expect(commands).toBeUndefined();
      expect(addDeprecation).toBeCalledTimes(0);
    });

    it('remove the old property but does not overrides the new one if they both exist, and logs a specific message', () => {
      const rawConfig = {
        myplugin: {
          deprecated: 'deprecated',
          renamed: 'renamed',
        },
      };
      const commands = renameFromRoot('myplugin.deprecated', 'myplugin.renamed')(
        rawConfig,
        'does-not-matter',
        addDeprecation
      );
      expect(commands).toEqual({
        unset: [{ path: 'myplugin.deprecated' }],
      });

      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Make sure \\"myplugin.renamed\\" contains the correct value in the config file, CLI flag, or environment variable (in Docker only).",
                  "Remove \\"myplugin.deprecated\\" from the config.",
                ],
              },
              "message": "\\"myplugin.deprecated\\" is deprecated and has been replaced by \\"myplugin.renamed\\". However both key are present, ignoring \\"myplugin.deprecated\\"",
            },
          ],
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
      const commands = unused('deprecated')(rawConfig, 'myplugin', addDeprecation);
      expect(commands).toEqual({
        unset: [{ path: 'myplugin.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Remove \\"myplugin.deprecated\\" from the Kibana config file, CLI flag, or environment variable (in Docker only)",
                ],
              },
              "message": "myplugin.deprecated is deprecated and is no longer used",
            },
          ],
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
      const commands = unused('section.deprecated')(rawConfig, 'myplugin', addDeprecation);
      expect(commands).toEqual({
        unset: [{ path: 'myplugin.section.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Remove \\"myplugin.section.deprecated\\" from the Kibana config file, CLI flag, or environment variable (in Docker only)",
                ],
              },
              "message": "myplugin.section.deprecated is deprecated and is no longer used",
            },
          ],
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
      const commands = unused('deprecated')(rawConfig, 'myplugin', addDeprecation);
      expect(commands).toBeUndefined();
      expect(addDeprecation).toBeCalledTimes(0);
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
      const commands = unusedFromRoot('myplugin.deprecated')(
        rawConfig,
        'does-not-matter',
        addDeprecation
      );
      expect(commands).toEqual({
        unset: [{ path: 'myplugin.deprecated' }],
      });
      expect(addDeprecation.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "correctiveActions": Object {
                "manualSteps": Array [
                  "Remove \\"myplugin.deprecated\\" from the Kibana config file, CLI flag, or environment variable (in Docker only)",
                ],
              },
              "message": "myplugin.deprecated is deprecated and is no longer used",
            },
          ],
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
      const commands = unusedFromRoot('myplugin.deprecated')(
        rawConfig,
        'does-not-matter',
        addDeprecation
      );
      expect(commands).toBeUndefined();
      expect(addDeprecation).toBeCalledTimes(0);
    });
  });
});
