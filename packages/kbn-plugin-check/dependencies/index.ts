/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Flags } from '@kbn/dev-cli-runner';
import { findTeamPlugins } from '@kbn/docs-utils';
import { ToolingLog } from '@kbn/tooling-log';
import { Project } from 'ts-morph';
import { getPlugin } from '../lib';
import { displayDependencyCheck } from './display_dependency_check';

export const checkDependencies = (flags: Flags, log: ToolingLog) => {
  const checkPlugin = (name: string) => {
    const plugin = getPlugin(name, log);

    if (!plugin) {
      log.error(`Cannot find plugin ${name}`);
      return;
    }

    const project = new Project({
      tsConfigFilePath: `${plugin.directory}/tsconfig.json`,
    });

    displayDependencyCheck(project, plugin, log);
  };

  const pluginName = flags.plugin && typeof flags.plugin === 'string' ? flags.plugin : null;
  const teamName = flags.team && typeof flags.team === 'string' ? flags.team : null;

  if ((!pluginName && !teamName) || (pluginName && teamName)) {
    log.error(`Must specify plugin or team name.`);
    return;
  }

  if (pluginName) {
    checkPlugin(pluginName);
  }

  if (teamName) {
    const plugins = findTeamPlugins(teamName);

    plugins.forEach((plugin) => {
      checkPlugin(plugin.manifest.id);
    });
  }
};
