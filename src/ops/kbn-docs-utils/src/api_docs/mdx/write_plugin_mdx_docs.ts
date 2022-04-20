/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import fs from 'fs';
import Path from 'path';
import dedent from 'dedent';
import { PluginApi, ScopeApi } from '../types';
import {
  countScopeApi,
  getPluginApiDocId,
  snakeToCamel,
  groupPluginApi,
  getFileName,
  getSlug,
} from '../utils';
import { writePluginDocSplitByFolder } from './write_plugin_split_by_folder';
import { WritePluginDocsOpts } from './types';

/**
 * Converts the plugin doc to mdx and writes it into the file system. If the plugin,
 * has serviceFolders specified in it's kibana.json, multiple mdx files will be written.
 *
 * @param folder The location the mdx files will be written too.
 * @param doc Contains the information of the plugin that will be written into mdx.
 * @param log Used for logging debug and error information.
 */
export function writePluginDocs(
  folder: string,
  { doc, plugin, pluginStats, log }: WritePluginDocsOpts
): void {
  if (doc.serviceFolders) {
    log.debug(`Splitting plugin ${doc.id}`);
    writePluginDocSplitByFolder(folder, { doc, log, plugin, pluginStats });
  } else {
    writePluginDoc(folder, { doc, plugin, pluginStats, log });
  }
}

function hasPublicApi(doc: PluginApi): boolean {
  return doc.client.length > 0 || doc.server.length > 0 || doc.common.length > 0;
}

/**
 * Converts the plugin doc to mdx and writes it into the file system. Ignores
 * the serviceFolders setting. Use {@link writePluginDocs} if you wish to split
 * the plugin into potentially multiple mdx files.
 *
 * @param folder The location the mdx file will be written too.
 * @param doc Contains the information of the plugin that will be written into mdx.
 * @param log Used for logging debug and error information.
 */
export function writePluginDoc(
  folder: string,
  { doc, log, plugin, pluginStats }: WritePluginDocsOpts
): void {
  if (!hasPublicApi(doc)) {
    log.debug(`${doc.id} does not have a public api. Skipping.`);
    return;
  }

  log.debug(`Writing plugin file for ${doc.id}`);

  const fileName = getFileName(doc.id);
  const slug = getSlug(doc.id);

  // Append "obj" to avoid special names in here. 'case' is one in particular that
  // caused issues.
  const json = getJsonName(fileName) + 'Obj';
  const name = plugin.manifest.owner?.name;
  let mdx =
    dedent(`
---
id: ${getPluginApiDocId(doc.id)}
slug: /kibana-dev-docs/api/${slug}
title: "${doc.id}"
image: https://source.unsplash.com/400x175/?github
summary: API docs for the ${doc.id} plugin
date: ${moment().format('YYYY-MM-DD')}
tags: ['contributor', 'dev', 'apidocs', 'kibana', '${doc.id}']
warning: This document is auto-generated and is meant to be viewed inside our experimental, new docs system. Reach out in #docs-engineering for more info.
---
import ${json} from './${fileName}.devdocs.json';

${plugin.manifest.description ?? ''}

${
  plugin.manifest.owner.githubTeam && name
    ? `Contact [${name}](https://github.com/orgs/elastic/teams/${plugin.manifest.owner.githubTeam}) for questions regarding this plugin.`
    : name
    ? `Contact ${name} for questions regarding this plugin.`
    : ''
}

**Code health stats**

| Public API count  | Any count | Items lacking comments | Missing exports |
|-------------------|-----------|------------------------|-----------------|
| ${pluginStats.apiCount} | ${pluginStats.isAnyType.length} | ${
      pluginStats.missingComments.length
    } | ${pluginStats.missingExports} |

`) + '\n\n';

  const scopedDoc = {
    ...doc,
    client: groupPluginApi(doc.client),
    common: groupPluginApi(doc.common),
    server: groupPluginApi(doc.server),
  };
  fs.writeFileSync(
    Path.resolve(folder, fileName + '.devdocs.json'),
    JSON.stringify(scopedDoc, null, 2)
  );

  mdx += scopApiToMdx(scopedDoc.client, 'Client', json, 'client');
  mdx += scopApiToMdx(scopedDoc.server, 'Server', json, 'server');
  mdx += scopApiToMdx(scopedDoc.common, 'Common', json, 'common');

  fs.writeFileSync(Path.resolve(folder, fileName + '.mdx'), mdx);
}

function getJsonName(name: string): string {
  return snakeToCamel(getFileName(name));
}

function scopApiToMdx(scope: ScopeApi, title: string, json: string, scopeName: string): string {
  let mdx = '';
  if (countScopeApi(scope) > 0) {
    mdx += `## ${title}\n\n`;

    if (scope.setup) {
      mdx += `### Setup\n`;
      mdx += `<DocDefinitionList data={[${json}.${scopeName}.setup]}/>\n\n`;
    }
    if (scope.start) {
      mdx += `### Start\n`;
      mdx += `<DocDefinitionList data={[${json}.${scopeName}.start]}/>\n\n`;
    }
    if (scope.objects.length > 0) {
      mdx += `### Objects\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.objects}/>\n\n`;
    }
    if (scope.functions.length > 0) {
      mdx += `### Functions\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.functions}/>\n\n`;
    }
    if (scope.classes.length > 0) {
      mdx += `### Classes\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.classes}/>\n\n`;
    }
    if (scope.interfaces.length > 0) {
      mdx += `### Interfaces\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.interfaces}/>\n\n`;
    }
    if (scope.enums.length > 0) {
      mdx += `### Enums\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.enums}/>\n\n`;
    }
    if (scope.misc.length > 0) {
      mdx += `### Consts, variables and types\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.misc}/>\n\n`;
    }
  }
  return mdx;
}
