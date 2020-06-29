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

import expiry from 'expiry-js';
import { resolve } from 'path';

function generateUrls({ version, plugin }) {
  return [
    plugin,
    `https://artifacts.elastic.co/downloads/kibana-plugins/${plugin}/${plugin}-${version}.zip`,
  ];
}

export function parseMilliseconds(val) {
  let result;

  try {
    const timeVal = expiry(val);
    result = timeVal.asMilliseconds();
  } catch (ex) {
    result = 0;
  }

  return result;
}

export function parse(command, options, kbnPackage) {
  const settings = {
    timeout: options.timeout || 0,
    quiet: options.quiet || false,
    silent: options.silent || false,
    config: options.config || '',
    optimize: options.optimize,
    plugin: command,
    version: kbnPackage.version,
    pluginDir: options.pluginDir || '',
  };

  settings.urls = generateUrls(settings);
  settings.workingPath = resolve(settings.pluginDir, '.plugin.installing');
  settings.tempArchiveFile = resolve(settings.workingPath, 'archive.part');
  settings.tempPackageFile = resolve(settings.workingPath, 'package.json');
  settings.setPlugin = function (plugin) {
    settings.plugin = plugin;
    settings.pluginPath = resolve(settings.pluginDir, settings.plugin.name);
  };

  return settings;
}
