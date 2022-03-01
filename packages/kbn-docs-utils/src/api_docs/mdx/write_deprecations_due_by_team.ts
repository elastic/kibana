/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { ToolingLog } from '@kbn/dev-utils';
import dedent from 'dedent';
import fs from 'fs';
import Path from 'path';
import {
  ApiDeclaration,
  ApiReference,
  PluginOrPackage,
  ReferencedDeprecationsByPlugin,
} from '../types';
import { getPluginApiDocId } from '../utils';

export function writeDeprecationDueByTeam(
  folder: string,
  deprecationsByPlugin: ReferencedDeprecationsByPlugin,
  plugins: PluginOrPackage[],
  log: ToolingLog
): void {
  const groupedByTeam: ReferencedDeprecationsByPlugin = Object.keys(deprecationsByPlugin).reduce(
    (teamMap: ReferencedDeprecationsByPlugin, pluginId: string) => {
      const dueDeprecations = deprecationsByPlugin[pluginId].filter(
        (dep) => !!dep.deprecatedApi.removeBy
      );
      if (!dueDeprecations || dueDeprecations.length === 0) return teamMap;

      const pluginMetaInfo = plugins.find((p) => p.manifest.id === pluginId);
      if (!pluginMetaInfo || !pluginMetaInfo.manifest.owner.name) return teamMap;

      if (!teamMap[pluginMetaInfo.manifest.owner.name]) {
        teamMap[pluginMetaInfo.manifest.owner.name] = [];
      }
      teamMap[pluginMetaInfo.manifest.owner.name].push(...dueDeprecations);
      return teamMap;
    },
    {} as ReferencedDeprecationsByPlugin
  );

  const tableMdx = Object.keys(groupedByTeam)
    .sort()
    .map((key) => {
      const groupedDeprecationReferences: {
        [key: string]: { api: ApiDeclaration; refs: ApiReference[] };
      } = groupedByTeam[key].reduce((acc, deprecation) => {
        if (acc[deprecation.deprecatedApi.id] === undefined) {
          acc[deprecation.deprecatedApi.id] = { api: deprecation.deprecatedApi, refs: [] };
        }
        acc[deprecation.deprecatedApi.id].refs.push(deprecation.ref);
        return acc;
      }, {} as { [key: string]: { api: ApiDeclaration; refs: ApiReference[] } });

      return `
    ## ${key}
    
    | Plugin | Deprecated API | Reference location(s) | Remove By |
    | --------|-------|-----------|-----------|
    ${Object.keys(groupedDeprecationReferences)
      .map((dep) => {
        const api = groupedDeprecationReferences[dep].api;
        const refs = groupedDeprecationReferences[dep].refs;

        if (refs.length === 0) return;

        const deprecatedAPILink = `<DocLink id="${getPluginApiDocId(
          api.parentPluginId
        )}" section="${api.id}" text="${api.label}"/>`;

        const firstTen = refs.splice(0, 10);
        const referencedLocations =
          firstTen
            .map(
              (ref) =>
                `[${ref.path.substr(
                  ref.path.lastIndexOf(Path.sep) + 1
                )}](https://github.com/elastic/kibana/tree/master/${
                  ref.path
                }#:~:text=${encodeURIComponent(api.label)})`
            )
            .join(', ') + (refs.length > 0 ? `+ ${refs.length} more` : '');

        const removeBy = api.removeBy ? api.removeBy : '-';

        // These were initially grouped by plugin, so each array of references is coming from a specific plugin.
        return `| ${firstTen[0].plugin} | ${deprecatedAPILink} | ${referencedLocations} | ${removeBy} |`;
      })
      .join('\n')}
    `;
    })
    .join('\n\n');

  const mdx = dedent(`
---
id: kibDevDocsDeprecationsDueByTeam
slug: /kibana-dev-docs/api-meta/deprecations-due-by-team
title: Deprecated APIs due to be removed, by team
summary: Lists the teams that are referencing deprecated APIs with a remove by date.
date: ${moment().format('YYYY-MM-DD')}
tags: ['contributor', 'dev', 'apidocs', 'kibana']
warning: This document is auto-generated and is meant to be viewed inside our experimental, new docs system.
---

${tableMdx}   

`);

  fs.writeFileSync(Path.resolve(folder, 'deprecations_by_team.mdx'), mdx);
}
