/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/dev-utils';
import { Project } from 'ts-morph';
import { getPluginApi } from './get_plugin_api';
import { writePluginDocs } from './mdx/write_plugin_mdx_docs';
import { findPlugins } from '../plugin_discovery';
import { ApiDeclaration, PluginApi } from './types';
import { mergeScopeApi } from './utils';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

function getTsProject(repoPath: string) {
  const xpackTsConfig = `${repoPath}/x-pack/tsconfig.json`;
  const project = new Project({
    tsConfigFilePath: xpackTsConfig,
  });
  project.addSourceFilesAtPaths(`${repoPath}/examples/**/*{.d.ts,.ts}`);
  project.addSourceFilesAtPaths(`${repoPath}/src/plugins/**/*{.d.ts,.ts}`);
  project.addSourceFilesAtPaths(`${repoPath}/x-pack/plugins/**/*{.d.ts,.ts}`);
  project.resolveSourceFileDependencies();
  return project;
}

export function buildApiDocs() {
  const project = getTsProject(REPO_ROOT);

  const plugins = Array.from(
    findPlugins({
      oss: false,
      examples: false,
      // Use this to capture "core" as a plugin.
      extraPluginScanDirs: [Path.resolve(REPO_ROOT, 'src')],
    }).values()
  );

  const pluginInfos: Array<{
    apiCount: number;
    apiCountMissingComments: number;
    plugin: string;
  }> = [];

  const outputFolder = Path.resolve(REPO_ROOT, 'api_docs');
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  } else {
    // Delete all files except the README that warns about the auto-generated nature of
    // the folder.
    const files = fs.readdirSync(outputFolder);
    files.forEach((file) => {
      if (file.indexOf('README.md') < 0) {
        fs.rmSync(Path.resolve(outputFolder, file));
      }
    });
  }

  plugins.forEach((plugin) => {
    const doc = getPluginApi(project, plugin, plugins, log);
    const info = {
      plugin: plugin.manifest.id,
      apiCount: countApiForPlugin(doc),
      apiCountMissingComments: countMissingCommentsApiForPlugin(doc),
    };

    if (info.apiCount > 0) {
      writePluginDocs(outputFolder, doc, log);
      pluginInfos.push(info);
    }
  });

  // eslint-disable-next-line no-console
  console.table(pluginInfos);
}

function countMissingCommentsApiForPlugin(doc: PluginApi) {
  return (
    mergeScopeApi(doc.client).reduce((sum, def) => {
      return sum + countMissingCommentsForApi(def);
    }, 0) +
    mergeScopeApi(doc.server).reduce((sum, def) => {
      return sum + countMissingCommentsForApi(def);
    }, 0) +
    mergeScopeApi(doc.common).reduce((sum, def) => {
      return sum + countMissingCommentsForApi(def);
    }, 0)
  );
}

function countMissingCommentsForApi(doc: ApiDeclaration): number {
  const missingCnt = doc.description && doc.description.length > 0 ? 0 : 1;
  if (!doc.children) return missingCnt;
  else
    return (
      missingCnt +
      doc.children.reduce((sum, child) => {
        return sum + countMissingCommentsForApi(child);
      }, 0)
    );
}

function countApiForPlugin(doc: PluginApi) {
  return (
    mergeScopeApi(doc.client).reduce((sum, def) => {
      return sum + countApi(def);
    }, 0) +
    mergeScopeApi(doc.server).reduce((sum, def) => {
      return sum + countApi(def);
    }, 0) +
    mergeScopeApi(doc.common).reduce((sum, def) => {
      return sum + countApi(def);
    }, 0)
  );
}

function countApi(doc: ApiDeclaration): number {
  if (!doc.children) return 1;
  else
    return (
      1 +
      doc.children.reduce((sum, child) => {
        return sum + countApi(child);
      }, 0)
    );
}
