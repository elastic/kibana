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

import chalk from 'chalk';
import { join } from 'path';
import { capitalize, camelCase } from 'lodash';
import { ICommand } from './';
import {
  mkdirp,
  readFile,
  writeFile,
  isDirectory,
  unlink,
  deleteFolderRecursive,
} from '../utils/fs';
import { log } from '../utils/log';

const PLUGINS_BASE_PATH = 'src/plugins';

function replacePluginName(template: string, pluginName: string) {
  return template.replace(/\[PLUGIN_CLASS_NAME\]/g, pluginName);
}

async function addFotmattedTemplate(
  rootPath: string,
  templateType: 'public' | 'server' | 'common',
  fileName: string,
  pluginName: string
) {
  const templateContent = await readFile(
    join(__dirname, '..', `templates/${templateType}/${fileName}.tmpl`)
  );
  const pluginClassName = `${capitalize(pluginName)}`;
  const formattedTemplate = replacePluginName(templateContent.toString(), pluginClassName);
  return await writeFile(
    join(rootPath, PLUGINS_BASE_PATH, pluginName, templateType, fileName),
    formattedTemplate
  );
}

async function pluginExists(pluginPath: string) {
  return isDirectory(pluginPath);
}

export const PluginCommand: ICommand = {
  description: 'Initialize a new plugin.',
  name: 'plugin',

  async run(projects, projectGraph, { options, rootPath }) {
    const pluginName = options._[1];
    const pluginPath = join(rootPath, PLUGINS_BASE_PATH, pluginName);
    if (await pluginExists(pluginPath)) {
      log.write(chalk.red(`\nPlugin ${pluginName} already exists in ${rootPath}`));
      return;
    }

    const hasUi = options.ui === true;
    const hasServer = options.server === true;

    if (!hasUi && !hasServer) {
      log.write(
        chalk.red(`\nPlugins should have either a server or a ui component. Run yarn kbn for help.`)
      );
      return;
    }

    log.write(
      chalk.bold(
        `\nInitializing plugin ${pluginName} (server ${hasServer ? 'enabled' : 'disabled'}, ui ${
          hasUi ? 'enabled' : 'disabled'
        })`
      )
    );

    try {
      await mkdirp(pluginPath);

      const pluginKibanaJson = {
        id: pluginName,
        version: 'kibana',
        server: hasServer,
        ui: hasUi,
        requiredPlugins: [],
      };

      await writeFile(join(pluginPath, 'kibana.json'), JSON.stringify(pluginKibanaJson, null, 2));

      await writeFile(join(pluginPath, 'README.md'), `# ${pluginName}\n`);

      if (hasUi || hasServer) {
        const commonPath = join(pluginPath, 'common');
        await mkdirp(commonPath);

        await addFotmattedTemplate(rootPath, 'common', 'index.ts', pluginName);
      }

      if (hasUi) {
        await mkdirp(join(pluginPath, 'public'));

        await addFotmattedTemplate(rootPath, 'public', 'index.ts', pluginName);
        await addFotmattedTemplate(rootPath, 'public', 'plugin.ts', pluginName);
        await addFotmattedTemplate(rootPath, 'public', 'types.ts', pluginName);
      }

      if (hasServer) {
        await mkdirp(join(pluginPath, 'server'));
        await addFotmattedTemplate(rootPath, 'server', 'index.ts', pluginName);
        await addFotmattedTemplate(rootPath, 'server', 'plugin.ts', pluginName);
      }

      // Update .i18nrc.json
      const i18nPath = join(rootPath, '.i18nrc.json');
      const i18nrcContent = await readFile(i18nPath);
      const i18nrcJson = JSON.parse(i18nrcContent.toString());
      i18nrcJson.paths[camelCase(pluginName)] = join(PLUGINS_BASE_PATH, pluginName);
      await writeFile(i18nPath, JSON.stringify(i18nrcJson, null, 2));

      log.write(chalk.green(`\nInitialized plugin ${pluginName} successfully`));
    } catch (e) {
      log.write(chalk.red(`\Failed to initialize plugin ${pluginName}. Cleaning up.`));
      try {
        deleteFolderRecursive(pluginPath);
        log.write(chalk.white(`\Cleanup ${pluginName} complete.`));
      } catch (cleanUpErr) {
        log.write(chalk.red(`\Failed to cleanup plugin ${pluginName}.`));
      }
    }
  },
};
