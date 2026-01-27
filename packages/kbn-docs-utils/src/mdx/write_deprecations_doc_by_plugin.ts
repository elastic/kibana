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
import type { ApiDeclaration, ApiReference, ReferencedDeprecationsByPlugin } from '../types';
import { AUTO_GENERATED_WARNING } from '../auto_generated_warning';
import { getPluginApiDocId } from '../utils';

export async function writeDeprecationDocByPlugin(
  folder: string,
  deprecationsByPlugin: ReferencedDeprecationsByPlugin,
  log: ToolingLog
): Promise<void> {
  const tableMdx = Object.keys(deprecationsByPlugin)
    .sort()
    .map((key) => {
      const groupedDeprecationReferences: {
        [key: string]: { api: ApiDeclaration; refs: ApiReference[] };
      } = deprecationsByPlugin[key].reduce((acc, deprecation) => {
        if (acc[deprecation.deprecatedApi.id] === undefined) {
          acc[deprecation.deprecatedApi.id] = { api: deprecation.deprecatedApi, refs: [] };
        }
        acc[deprecation.deprecatedApi.id].refs.push(deprecation.ref);
        return acc;
      }, {} as { [key: string]: { api: ApiDeclaration; refs: ApiReference[] } });

      return `
    ## ${key}

    | Deprecated API | Reference location(s) | Remove By |
    | ---------------|-----------|-----------|
    ${Object.keys(groupedDeprecationReferences)
      .map((dep) => {
        const api = groupedDeprecationReferences[dep].api;
        const refs = groupedDeprecationReferences[dep].refs;

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

        return `| ${deprecatedAPILink} | ${referencedLocations} | ${removeBy} |`;
      })
      .join('\n')}
    `;
    })
    .join('\n\n');

  const mdx = dedent(`
---
${AUTO_GENERATED_WARNING}
id: kibDevDocsDeprecationsByPlugin
slug: /kibana-dev-docs/api-meta/deprecated-api-list-by-plugin
title: Deprecated API usage by plugin
description: A list of deprecated APIs, which plugins are still referencing them, and when they need to be removed by.
date: ${moment().format('YYYY-MM-DD')}
tags: ['contributor', 'dev', 'apidocs', 'kibana']
---

${tableMdx}

`);

  await Fsp.writeFile(Path.resolve(folder, 'deprecations_by_plugin.mdx'), mdx);
}
