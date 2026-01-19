/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { ToolingLog } from '@kbn/tooling-log';
import dedent from 'dedent';
import Fsp from 'fs/promises';
import Path from 'path';
import type {
  ApiDeclaration,
  ApiReference,
  PluginOrPackage,
  ReferencedDeprecationsByPlugin,
} from '../types';
import { AUTO_GENERATED_WARNING } from '../auto_generated_warning';
import { getPluginApiDocId } from '../utils';

export async function writeDeprecationDueByTeam(
  folder: string,
  deprecationsByPlugin: ReferencedDeprecationsByPlugin,
  plugins: PluginOrPackage[],
  log: ToolingLog
): Promise<void> {
  const groupedByTeam: ReferencedDeprecationsByPlugin = Object.keys(deprecationsByPlugin).reduce(
    (teamMap: ReferencedDeprecationsByPlugin, pluginId: string) => {
      const dueDeprecations = deprecationsByPlugin[pluginId].filter(
        (dep) => !!dep.deprecatedApi.removeBy
      );
      if (!dueDeprecations || dueDeprecations.length === 0) return teamMap;

      const pluginMetaInfo = plugins.find((p) => p.id === pluginId);
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

        const firstTen = refs.slice(0, 10);
        const remainingCount = refs.length - 10;
        const referencedLocations =
          firstTen
            .map(
              (ref) =>
                `[${ref.path.substr(
                  ref.path.lastIndexOf(Path.sep) + 1
                )}](https://github.com/elastic/kibana/tree/main/${
                  ref.path
                }#:~:text=${encodeURIComponent(api.label)})`
            )
            .join(', ') + (remainingCount > 0 ? `+ ${remainingCount} more` : '');

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
${AUTO_GENERATED_WARNING}
id: kibDevDocsDeprecationsDueByTeam
slug: /kibana-dev-docs/api-meta/deprecations-due-by-team
title: Deprecated APIs due to be removed, by team
description: Lists the teams that are referencing deprecated APIs with a remove by date.
date: ${moment().format('YYYY-MM-DD')}
tags: ['contributor', 'dev', 'apidocs', 'kibana']
---

${tableMdx}

`);

  await Fsp.writeFile(Path.resolve(folder, 'deprecations_by_team.mdx'), mdx);
}
