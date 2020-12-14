/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import fs from 'fs';
import Path from 'path';
import dedent from 'dedent';
import { PluginApi, ScopeApi } from '../types';
import { countScopeApi, getPluginApiDocId, snakeToCamel, camelToSnake } from '../utils';
import { writePluginDocSplitByFolder } from './write_plugin_split_by_folder';

/**
 * Converts the plugin doc to mdx and writes it into the file system. If the plugin,
 * has serviceFolders specified in it's kibana.json, multiple mdx files will be written.
 *
 * @param folder The location the mdx files will be written too.
 * @param doc Contains the information of the plugin that will be written into mdx.
 * @param log Used for logging debug and error information.
 */
export function writePluginDocs(folder: string, doc: PluginApi, log: ToolingLog): void {
  if (doc.serviceFolders) {
    log.debug(`Splitting plugin ${doc.id}`);
    writePluginDocSplitByFolder(folder, doc, log);
  } else {
    writePluginDoc(folder, doc, log);
  }
}

function hasPublicApi(doc: PluginApi): boolean {
  return (
    countScopeApi(doc.client) > 0 || countScopeApi(doc.server) > 0 || countScopeApi(doc.common) > 0
  );
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
export function writePluginDoc(folder: string, doc: PluginApi, log: ToolingLog): void {
  if (!hasPublicApi(doc)) {
    log.debug(`${doc.id} does not have a public api. Skipping.`);
    return;
  }

  log.debug(`Writing plugin file for ${doc.id}`);

  const fileName = getFileName(doc.id);
  // Append "obj" to avoid special names in here. 'case' is one in particular that
  // caused issues.
  const json = getJsonName(fileName) + 'Obj';
  let mdx =
    dedent(`
---
id: ${getPluginApiDocId(doc.id)}
slug: /kibana-dev-docs/${doc.id}PluginApi
title: ${doc.id}
image: https://source.unsplash.com/400x175/?github
summary: API docs for the ${doc.id} plugin
date: 2020-11-16
tags: ['contributor', 'dev', 'apidocs', 'kibana', '${doc.id}']
---

import ${json} from './${fileName}.json';

`) + '\n\n';

  fs.writeFileSync(Path.resolve(folder, fileName + '.json'), JSON.stringify(doc));

  mdx += scopApiToMdx(doc.client, 'Client', json, 'client');
  mdx += scopApiToMdx(doc.server, 'Server', json, 'server');
  mdx += scopApiToMdx(doc.common, 'Common', json, 'common');

  fs.writeFileSync(Path.resolve(folder, fileName + '.mdx'), mdx);
}

function getJsonName(name: string): string {
  return snakeToCamel(getFileName(name));
}

function getFileName(name: string): string {
  return camelToSnake(name.replace('.', '_'));
}

function scopApiToMdx(scope: ScopeApi, title: string, json: string, scopeName: string): string {
  let mdx = '';
  if (countScopeApi(scope) > 0) {
    mdx += `## ${title}\n\n`;

    if (scope.setup) {
      mdx += `### Setup\n`;
      mdx += `<DocDefinitionList data={[${json}.${scopeName}.setup]}/>\n`;
    }
    if (scope.start) {
      mdx += `### Start\n`;
      mdx += `<DocDefinitionList data={[${json}.${scopeName}.start]}/>\n`;
    }
    if (scope.objects.length > 0) {
      mdx += `### Objects\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.objects}/>\n`;
    }
    if (scope.functions.length > 0) {
      mdx += `### Functions\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.functions}/>\n`;
    }
    if (scope.classes.length > 0) {
      mdx += `### Classes\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.classes}/>\n`;
    }
    if (scope.interfaces.length > 0) {
      mdx += `### Interfaces\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.interfaces}/>\n`;
    }
    if (scope.enums.length > 0) {
      mdx += `### Enums\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.enums}/>\n`;
    }
    if (scope.misc.length > 0) {
      mdx += `### Consts, variables and types\n`;
      mdx += `<DocDefinitionList data={${json}.${scopeName}.misc}/>\n`;
    }
  }
  return mdx;
}
