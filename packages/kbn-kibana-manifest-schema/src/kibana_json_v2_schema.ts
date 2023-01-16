/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { JSONSchema } from 'json-schema-typed';
import { desc } from './desc';

export const PLUGIN_ID_PATTERN = /^[a-z][a-zA-Z_]*$/;

export const MANIFEST_V2: JSONSchema = {
  type: 'object',
  required: ['id', 'type', 'owner'],
  // @ts-expect-error VSCode specific JSONSchema extension
  allowTrailingCommas: true,
  properties: {
    id: {
      type: 'string',
      pattern: '^@kbn/',
      description: desc`
        Module ID for this package. This must be globbally unique amoungst all
        packages and should include the most important information about how this
        package should be used. Avoid generic names to aid in disambiguation.
      `,
    },
    owner: {
      oneOf: [
        {
          type: 'string',
          pattern: '^@',
        },
        {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^@',
          },
        },
      ],
      description: desc`
        Github handle for the person or team who is responsible for this package.
        This owner will be used in the codeowners files for this package.

        For additional codeowners, the value can be an array of user/team names.
      `,
    },
    devOnly: {
      type: 'boolean',
      description: desc`
        A devOnly package can be used by other devOnly packages and only by other devOnly
        packages and will never be included in the distributable.
      `,
      default: false,
    },
  },
  oneOf: [
    {
      type: 'object',
      properties: {
        type: {
          enum: ['plugin-browser', 'plugin-server'],
        },
        plugin: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              pattern: PLUGIN_ID_PATTERN.source,
            },
            configPath: {
              description:
                'Root configuration path used by the plugin, defaults to "id" in snake_case format.',
              type: 'array',
              items: {
                type: 'string',
                pattern: PLUGIN_ID_PATTERN.source,
              },
            },
            requiredPlugins: {
              type: 'array',
              items: {
                type: 'string',
                pattern: PLUGIN_ID_PATTERN.source,
              },
            },
            optionalPlugins: {
              type: 'array',
              items: {
                type: 'string',
                pattern: PLUGIN_ID_PATTERN.source,
              },
            },
            description: {
              description: desc`
                A brief description of what this plugin does and any capabilities it provides.
              `,
              type: 'string',
            },
            enabledOnAnonymousPages: {
              description: desc`
                Specifies whether this plugin - and its required dependencies - will be enabled for anonymous pages (login page, status page when
                configured, etc.) Default is false.
              `,
              type: 'boolean',
            },
            serviceFolders: {
              description: desc`
                Only used for the automatically generated API documentation. Specifying service
                folders will cause your plugin API reference to be broken up into sub sections.
              `,
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
    {
      type: 'object',
      properties: {
        type: {
          const: 'shared-browser',
        },
        sharedBrowserBundle: {
          type: 'boolean',
          description: desc`
            Set this flag to true for this package to produce it's own bundle that will be loaded
            asynchronously when needed. Defaults to false.
          `,
        },
      },
    },
    {
      type: 'object',
      properties: {
        type: {
          enum: [
            'shared-server',
            'shared-common',
            'functional-tests',
            'test-helper',
            'shared-scss',
          ],
        },
      },
    },
  ],
};
