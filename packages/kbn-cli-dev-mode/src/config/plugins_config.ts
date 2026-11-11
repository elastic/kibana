/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf, Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { Env } from '@kbn/config';
import { KIBANA_GROUPS, type KibanaGroup } from '@kbn/projects-solutions-groups';

export const pluginsConfigSchema = schema.object(
  {
    paths: schema.arrayOf(schema.string(), { defaultValue: [] }),
    // Mirror of core's `plugins.allowlistPluginGroups` so the optimizer can
    // build only the browser plugins the server actually loads.
    allowlistPluginGroups: schema.maybe(
      schema.arrayOf(
        schema.oneOf(
          KIBANA_GROUPS.map((groupName) => schema.literal(groupName)) as [Type<KibanaGroup>]
        ),
        { maxSize: 50 }
      )
    ),
  },
  { unknowns: 'ignore' }
);

export type PluginsConfigType = TypeOf<typeof pluginsConfigSchema>;

/** @internal */
export class PluginsConfig {
  /**
   * Defines directories that we should scan for the plugin subdirectories.
   */
  public readonly pluginSearchPaths: string[];

  /**
   * Defines directories where an additional plugin exists.
   */
  public readonly additionalPluginPaths: string[];

  /**
   * Restricts plugin discovery to the given groups, matching core's server-side setting.
   */
  public readonly allowlistPluginGroups?: readonly KibanaGroup[];

  constructor(rawConfig: PluginsConfigType, env: Env) {
    this.pluginSearchPaths = [...env.pluginSearchPaths];
    this.additionalPluginPaths = rawConfig.paths;
    this.allowlistPluginGroups = rawConfig.allowlistPluginGroups;
  }
}
