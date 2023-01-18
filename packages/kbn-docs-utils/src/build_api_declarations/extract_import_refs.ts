/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { getApiSectionId, getPluginApiDocId, getPluginForPath } from '../utils';
import { ApiScope, PluginOrPackage, TextWithLinks } from '../types';
import { getRelativePath, pathsOutsideScopes } from './utils';

/**
 *
 * @param text A string that may include an API item that was imported from another file. For example:
 * "export type foo = string | import("kibana/src/plugins/a_plugin/public/path").Bar".
 * @param plugins The list of registered Kibana plugins. Used to get the plugin id, which is then used to create
 * the DocLink to that plugin's page, based off the relative path of any imports.
 * @param log Logging utility for debuging
 *
 * @returns An array structure that can be used to create react DocLinks. For example, the above text would return
 * something like:
 * [ "export type foo = string | ", // Just a string for the pretext
 *   { id: "a_plugin", section: "public.Bar", text: "Bar" } // An object with info to create the DocLink.
 * ]
 */
export function extractImportReferences(
  text: string,
  plugins: PluginOrPackage[],
  log: ToolingLog
): TextWithLinks {
  const texts: TextWithLinks = [];
  let textSegment: string | undefined = text;
  while (textSegment) {
    const ref = extractImportRef(textSegment);
    if (ref) {
      const { name, path, index, length } = ref;
      if (index !== 0) {
        texts.push(textSegment.substr(0, index));
      }
      const plugin = getPluginForPath(path, plugins);
      if (!plugin) {
        if (path.indexOf('plugin') >= 0) {
          log.warning('WARN: no plugin found for reference path ' + path);
        }
        // If we can't create a link for this, still remove the import("..."). part to make
        // it easier to read.
        const str = textSegment.substr(index + length - name.length, name.length);
        if (str && str !== '') {
          texts.push(str);
        } else {
          // If there is no ".Name" then use the full path. You can see things like "typeof import("file")"
          texts.push(getRelativePath(path));
        }
      } else {
        const section = getApiSectionId({
          scope: getScopeFromPath(path, plugin, log),
          id: name,
        });
        texts.push({
          pluginId: plugin.manifest.id,
          scope: getScopeFromPath(path, plugin, log),
          docId: getPluginApiDocId(plugin.manifest.id, {
            serviceFolders: plugin.manifest.serviceFolders,
            apiPath: path,
            directory: plugin.directory,
          }),
          section: name && name !== '' ? section : undefined,
          text: name && name !== '' ? name : getRelativePath(path),
        });
      }

      // Prep textSegment to skip past the `import`, then check for more.
      textSegment = textSegment.substr(index + length);
    } else {
      if (textSegment && textSegment !== '') {
        texts.push(textSegment);
      }
      textSegment = undefined;
    }
  }
  return texts;
}

function extractImportRef(
  str: string
): { path: string; name: string; index: number; length: number } | undefined {
  const groups = str.match(/import\("(.*?)"\)\.?(\w*)/);
  if (groups) {
    const path = groups[1];
    const name = groups.length > 2 ? groups[2] : '';
    const index = groups.index!;
    const length = groups[0].length;
    return { path, name, index, length };
  }
}

/**
 *
 * @param path An absolute path to a file inside a plugin directory.
 */
function getScopeFromPath(path: string, plugin: PluginOrPackage, log: ToolingLog): ApiScope {
  if (path.startsWith(`${plugin.directory}/public/`)) {
    return ApiScope.CLIENT;
  } else if (path.startsWith(`${plugin.directory}/server/`)) {
    return ApiScope.SERVER;
  } else if (path.startsWith(`${plugin.directory}/common/`)) {
    return ApiScope.COMMON;
  } else if (!plugin.isPlugin) {
    return plugin.scope ?? ApiScope.COMMON;
  } else {
    pathsOutsideScopes[path] = plugin.directory;
    return ApiScope.COMMON;
  }
}
