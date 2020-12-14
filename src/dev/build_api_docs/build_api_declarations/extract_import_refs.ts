/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, ToolingLog } from '@kbn/dev-utils';
import { getApiSectionId, getPluginApiDocId, getPluginForPath } from '../utils';
import { ApiScope, TextWithLinks } from '../types';

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
  plugins: KibanaPlatformPlugin[],
  log: ToolingLog
): TextWithLinks {
  const texts: TextWithLinks = [];
  let pos = 0;
  let textSegment: string | undefined = text;
  const max = 5;

  log.debug('Extracting references from ' + text);
  while (textSegment) {
    pos++;
    if (pos > max) break;

    const ref = extractImportRef(textSegment);
    if (ref) {
      const index = textSegment.indexOf('import("');
      texts.push(textSegment.substr(0, index));
      const { name, path } = ref;
      const lengthOfImport = 'import(".")'.length + path.length + name.length;
      const plugin = getPluginForPath(path, plugins);

      if (!plugin) {
        if (path.indexOf('plugin') >= 0) {
          log.warning('WARN: no plugin found for reference path ' + path);
        }
        // If we can't create a link for this, still remove the import("..."). part to make
        // it easier to read.
        texts.push(textSegment.substr(index + lengthOfImport - name.length, name.length));
      } else {
        const section = getApiSectionId({
          pluginName: plugin.manifest.id,
          scope: getScopeFromPath(path, log),
          apiName: name,
        });
        texts.push({
          docId: getPluginApiDocId(plugin.manifest.id, plugin.manifest.serviceFolders, path),
          section,
          text: name,
        });
      }
      textSegment = textSegment.substr(index + lengthOfImport);
    } else {
      texts.push(textSegment);
      textSegment = undefined;
    }
  }
  return texts;
}

function extractImportRef(str: string): { path: string; name: string } | undefined {
  const groups = str.match(/import\("(.*?)"\)\.(\w*)/);
  if (groups) {
    const path = groups[1];
    const name = groups[2];
    return { path, name };
  }
}

function getScopeFromPath(path: string, log: ToolingLog): ApiScope {
  if (path.indexOf('/public/') >= 0) {
    return ApiScope.CLIENT;
  } else if (path.indexOf('/server/') >= 0) {
    return ApiScope.SERVER;
  } else if (path.indexOf('/common/') >= 0) {
    return ApiScope.COMMON;
  } else {
    log.warning(`Unexpected path encountered ${path}`);
    return ApiScope.COMMON;
  }
}
