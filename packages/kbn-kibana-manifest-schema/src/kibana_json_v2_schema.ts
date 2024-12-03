/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    group: {
      enum: ['platform', 'observability', 'security', 'search'],
      description: desc`
        Specifies the group to which this module pertains.
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
    build: {
      type: 'object',
      properties: {
        extraExcludes: {
          type: 'array',
          description: desc`
            An array of micromatch patterns which will be used to exclude
            files/directories in this package from the build.
          `,
          items: {
            type: 'string',
          },
        },
        noParse: {
          type: 'array',
          description: desc`
            An array of micromatch patterns which will be used to exclude
            files from being transformed automatically. Use this to skip large
            assets which are already transpiled and do not need babel.
          `,
          items: {
            type: 'string',
          },
        },
      },
    },
    serviceFolders: {
      description: desc`
        Creates sections in the documentations based on the exports of the folders listed here.
        If you need this you should probably split up your package, which is why this is deprecated.
      `,
      type: 'array',
      items: { type: 'string' },
      deprecated: true,
    },
    description: {
      description: desc`
        A brief description of what this package does and any capabilities it provides.
      `,
      type: 'string',
    },
  },
  allOf: [
    {
      if: {
        properties: { group: { const: 'platform' } },
      },
      then: {
        properties: {
          visibility: {
            enum: ['private', 'shared'],
            description: desc`
        Specifies the visibility of this module, i.e. whether it can be accessed by everybody or only modules in the same group
      `,
            default: 'shared',
          },
        },
        required: ['visibility'],
      },
      else: {
        properties: {
          visibility: {
            const: 'private',
            description: desc`
        Specifies the visibility of this module, i.e. whether it can be accessed by everybody or only modules in the same group
      `,
            default: 'private',
          },
        },
        required: ['visibility'],
      },
    },
  ],
  oneOf: [
    {
      type: 'object',
      required: ['type', 'plugin'],
      properties: {
        type: {
          const: 'plugin',
        },
        plugin: {
          type: 'object',
          required: ['id', 'browser', 'server'],
          properties: {
            id: {
              type: 'string',
              pattern: PLUGIN_ID_PATTERN.source,
            },
            configPath: {
              description:
                'Root configuration path used by the plugin, defaults to "id" in snake_case format.',
              oneOf: [
                {
                  type: 'array',
                  items: { type: 'string' },
                },
                { type: 'string' },
              ],
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
            enabledOnAnonymousPages: {
              description: desc`
                Specifies whether this plugin - and its required dependencies - will be enabled for anonymous pages (login page, status page when
                configured, etc.) Default is false.
              `,
              type: 'boolean',
            },
            type: {
              description: desc`
                Only used to distinguish "preboot" plugins from standard plugins.
              `,
              enum: ['preboot'],
            },
            browser: {
              type: 'boolean',
              description: desc`
                Set this to true when your plugin has a browser-side component, causing the "public" directory
                to be imported in a webpack bundle and the browser plugin to be started by core.
              `,
            },
            server: {
              type: 'boolean',
              description: desc`
                Set this to true when your plugin has a server-side component, causing the "server" directory
                to be imported by the server and the plugin started by core.
              `,
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
