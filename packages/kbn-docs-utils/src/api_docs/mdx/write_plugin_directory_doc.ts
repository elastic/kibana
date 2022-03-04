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
import { ToolingLog } from '@kbn/dev-utils';
import { PluginApi, PluginMetaInfo } from '../types';
import { getPluginApiDocId } from '../utils';

function hasPublicApi(doc: PluginApi): boolean {
  return doc.client.length > 0 || doc.server.length > 0 || doc.common.length > 0;
}

interface TotalStats {
  pluginCnt: number;
  pluginCntWithPublicApi: number;
  teamCnt: number;
  totalApiCnt: number;
  missingCommentCnt: number;
  missingExportCnt: number;
  anyCnt: number;
}

/**
 * @param folder The location the mdx file will be written too.
 */
export function writePluginDirectoryDoc(
  folder: string,
  pluginApiMap: { [key: string]: PluginApi },
  pluginStatsMap: { [key: string]: PluginMetaInfo },
  log: ToolingLog
): void {
  log.debug(`Writing plugin directory file`);

  const uniqueTeams: string[] = [];

  const totalStats: TotalStats = Object.keys(pluginApiMap).reduce<TotalStats>(
    (acc, id) => {
      const metaInfo = pluginStatsMap[id];
      const doc = pluginApiMap[id];
      let teamCnt = acc.teamCnt;

      if (uniqueTeams.indexOf(metaInfo.owner.name) < 0) {
        uniqueTeams.push(metaInfo.owner.name);
        teamCnt++;
      }
      return {
        pluginCnt: acc.pluginCnt + 1,
        pluginCntWithPublicApi: acc.pluginCntWithPublicApi + (hasPublicApi(doc) ? 1 : 0),
        totalApiCnt: acc.totalApiCnt + metaInfo.apiCount,
        teamCnt,
        missingExportCnt: acc.missingExportCnt + metaInfo.missingExports,
        missingCommentCnt: acc.missingCommentCnt + metaInfo.missingComments.length,
        anyCnt: acc.anyCnt + metaInfo.isAnyType.length,
      };
    },
    {
      pluginCnt: 0,
      pluginCntWithPublicApi: 0,
      teamCnt: 0,
      missingExportCnt: 0,
      missingCommentCnt: 0,
      anyCnt: 0,
      totalApiCnt: 0,
    } as TotalStats
  );

  const mdx =
    dedent(`
---
id: kibDevDocsPluginDirectory
slug: /kibana-dev-docs/api-meta/plugin-api-directory
title: Directory
summary: Directory of public APIs available through plugins or packages.
date: ${moment().format('YYYY-MM-DD')}
tags: ['contributor', 'dev', 'apidocs', 'kibana']
warning: This document is auto-generated and is meant to be viewed inside our experimental, new docs system. Reach out in #docs-engineering for more info.
---

### Overall stats

| Count | Plugins or Packages with a <br /> public API | Number of teams | 
|--------------|----------|------------------------|
| ${totalStats.pluginCnt} | ${totalStats.pluginCntWithPublicApi} | ${totalStats.teamCnt} |

### Public API health stats

| API Count | Any Count | Missing comments | Missing exports | 
|--------------|----------|-----------------|--------|
| ${totalStats.totalApiCnt} | ${totalStats.anyCnt} | ${totalStats.missingCommentCnt} | ${
      totalStats.missingExportCnt
    } |

## Plugin Directory

| Plugin name &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  | Maintaining team | Description | API Cnt | Any Cnt | Missing<br />comments | Missing<br />exports | 
|--------------|----------------|-----------|--------------|----------|---------------|--------|
${getDirectoryTable(pluginApiMap, pluginStatsMap, true)}

## Package Directory

| Package name &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  | Maintaining team | Description | API Cnt | Any Cnt | Missing<br />comments | Missing<br />exports | 
|--------------|----------------|-----------|--------------|----------|---------------|--------|
${getDirectoryTable(pluginApiMap, pluginStatsMap, false)}

`) + '\n\n';

  fs.writeFileSync(Path.resolve(folder, 'plugin_directory.mdx'), mdx);
}

function getDirectoryTable(
  pluginApiMap: { [key: string]: PluginApi },
  pluginStatsMap: { [key: string]: PluginMetaInfo },
  includePlugins: boolean
): string {
  return Object.keys(pluginApiMap)
    .sort()
    .reduce<string[]>((acc, id) => {
      const metaInfo = pluginStatsMap[id];
      const doc = pluginApiMap[id];
      const hasApi = hasPublicApi(doc);
      if (!includePlugins) {
        // We are building the package list, skip plugins.
        if (metaInfo.isPlugin) return acc;

        // Also don't include packages without a public API. These are much more likely to be internal build/ops code and not
        // of interest to any plugin developer.
        if (!hasApi) return acc;
      }

      if (metaInfo.isPlugin && !includePlugins) return acc;
      if (!metaInfo.isPlugin && includePlugins) return acc;

      const docWithLink = hasApi
        ? `<DocLink id="${getPluginApiDocId(doc.id)}" text="${doc.id}"/>`
        : doc.id;
      const contact = metaInfo.owner.githubTeam
        ? `[${metaInfo.owner.name}](https://github.com/orgs/elastic/teams/${metaInfo.owner.githubTeam})`
        : metaInfo.owner.name;

      acc.push(
        `| ${[
          docWithLink,
          contact,
          metaInfo.description || '-',
          metaInfo.apiCount,
          metaInfo.isAnyType.length,
          metaInfo.missingComments.length,
          metaInfo.missingExports,
        ].join(' | ')} |`
      );
      return acc;
    }, [] as string[])
    .join('\n');
}
