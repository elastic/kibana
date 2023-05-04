/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { asyncForEachWithLimit } from '@kbn/std';
import { snakeToCamel } from '../utils';
import { PluginApi, ApiDeclaration } from '../types';
import { writePluginDoc } from './write_plugin_mdx_docs';
import { WritePluginDocsOpts } from './types';

// There is no science behind this 10.
// When it was first introduced, it was using synchronous APIs, so the concurrency was 1.
// Feel free to adapt it when more data is gathered.
const CONCURRENT_WRITES = 10;

export async function writePluginDocSplitByFolder(
  folder: string,
  { doc, plugin, pluginStats, log }: WritePluginDocsOpts
) {
  const apisByFolder = splitApisByFolder(doc);

  log.debug(`Split ${doc.id} into ${apisByFolder.length} services`);
  await asyncForEachWithLimit(apisByFolder, CONCURRENT_WRITES, async (docDef) => {
    // TODO: we should probably see if we can break down these stats by service folder. As it is, they will represent stats for
    // the entire plugin.
    await writePluginDoc(folder, { doc: docDef, plugin, pluginStats, log });
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
  const scopeFolder = scope === 'client' ? 'public' : scope;
  const matchGroup = dec.path.match(`.*?\/${scopeFolder}\/([^\/]*?)\/`);
  const serviceFolderName = matchGroup ? matchGroup[1] : undefined;

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
