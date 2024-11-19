/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { JSONSchema } from 'json-schema-typed';
import { desc } from './desc';

export const MANIFEST_V1: JSONSchema = {
  type: 'object',
  required: ['id', 'version', 'owner'],
  properties: {
    id: {
      description: desc`
        Identifier of the plugin. Must be a string in camelCase. Part of a plugin
        public contract. Other plugins leverage it to access plugin API, navigate
        to the plugin, etc.
      `,
      type: 'string',
      pattern: '^[a-z]{1}([a-zA-Z0-9]{1,})$',
    },
    version: {
      description: 'Version of the plugin.',
      type: 'string',
      pattern: '^(kibana|v?\\d+(\\.\\d+){0,2})$',
    },
    kibanaVersion: {
      description: desc`
        The version of Kibana the plugin is compatible with, defaults to the value of the version field.
      `,
      type: 'string',
      pattern: '^(kibana|)$',
    },
    type: {
      description: 'Type of the plugin, defaults to `standard`.',
      enum: ['standard', 'preboot'],
    },
    configPath: {
      description:
        'Root configuration path used by the plugin, defaults to "id" in snake_case format.',
      oneOf: [
        { type: 'string' },
        {
          type: 'array',
          items: { type: 'string' },
        },
      ],
    },
    requiredPlugins: {
      description: desc`
        An optional list of the other plugins that MUST BE installed and enabled for this
        plugin to function properly.
      `,
      type: 'array',
      items: { type: 'string' },
    },
    optionalPlugins: {
      description: desc`
        An optional list of the other plugins that if installed and enabled **may be**
        leveraged by this plugin for some additional functionality but otherwise are
        not required for this plugin to work properly.
      `,
      type: 'array',
      items: { type: 'string' },
    },
    requiredBundles: {
      description: desc`
        An optional list of the other plugins that if installed and enabled MAY BE leveraged
        by this plugin for some additional functionality but otherwise are not required for
        this plugin to work properly.

        The plugins listed here will be loaded in the browser, even if the plugin is
        disabled. Required by \`@kbn/optimizer\` to support cross-plugin imports.
        "core" and plugins already listed in \`requiredPlugins\` do not need to be
        duplicated here.
      `,
      type: 'array',
      items: { type: 'string' },
    },
    ui: {
      description: desc`
        Specifies whether plugin includes some client/browser specific functionality
        that should be included into client bundle via \`public/ui_plugin.js\` file.
      `,
      type: 'boolean',
    },
    server: {
      description: desc`
        Specifies whether plugin includes some server-side specific functionality.
      `,
      type: 'boolean',
    },
    extraPublicDirs: {
      description: desc`
        Specifies directory names that can be imported by other ui-plugins built
        using the same instance of the @kbn/optimizer. A temporary measure we plan
        to replace with better mechanisms for sharing static code between plugins
        @deprecated To be deleted when https://github.com/elastic/kibana/issues/101948 is done.
      `,
      type: 'array',
      items: { type: 'string' },
    },
    serviceFolders: {
      description: desc`
        Only used for the automatically generated API documentation. Specifying service
        folders will cause your plugin API reference to be broken up into sub sections.
      `,
      type: 'array',
      items: { type: 'string' },
    },
    owner: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          description: 'The name of the team that currently owns this plugin.',
          type: 'string',
        },
        githubTeam: {
          description: desc`
            All internal plugins should have a github team specified. GitHub teams can be
            viewed here: https://github.com/orgs/elastic/teams
          `,
          type: 'string',
        },
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
  },
};
