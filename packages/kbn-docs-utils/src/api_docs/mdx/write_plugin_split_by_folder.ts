/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { getServiceForPath, snakeToCamel } from '../utils';
import { PluginApi, ApiDeclaration } from '../types';
import { writePluginDoc } from './write_plugin_mdx_docs';

export function writePluginDocSplitByFolder(folder: string, doc: PluginApi, log: ToolingLog) {
  const apisByFolder = splitApisByFolder(doc);

  log.debug(`Split ${doc.id} into ${apisByFolder.length} services`);
  apisByFolder.forEach((docDef) => {
    writePluginDoc(folder, docDef, log);
  });
}

export function splitApisByFolder(pluginDoc: PluginApi): PluginApi[] {
  const pluginDocDefsByFolder: { [key: string]: PluginApi } = {};
  const mainPluginDocDef = createServicePluginDocDef(pluginDoc);

  pluginDoc.client.forEach((dec: ApiDeclaration) => {
    addSection(dec, 'client', mainPluginDocDef, pluginDocDefsByFolder, pluginDoc.serviceFolders!);
  });
  pluginDoc.server.forEach((dec: ApiDeclaration) => {
    addSection(dec, 'server', mainPluginDocDef, pluginDocDefsByFolder, pluginDoc.serviceFolders!);
  });
  pluginDoc.common.forEach((dec: ApiDeclaration) => {
    addSection(dec, 'common', mainPluginDocDef, pluginDocDefsByFolder, pluginDoc.serviceFolders!);
  });

  return [...Object.values(pluginDocDefsByFolder), mainPluginDocDef];
}

function addSection(
  dec: ApiDeclaration,
  scope: 'client' | 'server' | 'common',
  mainPluginDocDef: PluginApi,
  pluginServices: { [key: string]: PluginApi },
  serviceFolders: readonly string[]
) {
  const serviceFolderName = getServiceForPath(dec.source.path);
  if (serviceFolderName && serviceFolders.find((f) => f === serviceFolderName)) {
    const service = snakeToCamel(serviceFolderName);
    if (!pluginServices[service]) {
      pluginServices[service] = createServicePluginDocDef(mainPluginDocDef, service);
    }
    pluginServices[service][scope].push(dec);
  } else {
    mainPluginDocDef[scope].push(dec);
  }
}

function createServicePluginDocDef(pluginDoc: PluginApi, service?: string): PluginApi {
  return {
    id: service ? pluginDoc.id + '.' + service : pluginDoc.id,
    client: [],
    server: [],
    common: [],
  };
}
