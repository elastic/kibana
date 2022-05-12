/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { ToolingLog } from '@kbn/tooling-log';
import dedent from 'dedent';
import fs from 'fs';
import Path from 'path';
import {
  ApiReference,
  ReferencedDeprecationsByAPI,
  ReferencedDeprecationsByPlugin,
  UnreferencedDeprecationsByPlugin,
} from '../types';
import { getPluginApiDocId } from '../utils';

export function writeDeprecationDocByApi(
  folder: string,
  deprecationsByPlugin: ReferencedDeprecationsByPlugin,
  unReferencedDeprecations: UnreferencedDeprecationsByPlugin,
  log: ToolingLog
): void {
  const deprecationReferencesByApi = Object.values(deprecationsByPlugin).reduce(
    (acc, deprecations) => {
      deprecations.forEach((deprecation) => {
        if (acc[deprecation.deprecatedApi.id] === undefined) {
          acc[deprecation.deprecatedApi.id] = {
            deprecatedApi: deprecation.deprecatedApi,
            references: [],
          };
        }
        const refs: ApiReference[] = deprecation.deprecatedApi.references
          ? deprecation.deprecatedApi.references
          : [];
        acc[deprecation.deprecatedApi.id].references.push(...refs);
      });
      return acc;
    },
    {} as ReferencedDeprecationsByAPI
  );

  const tableMdx = `
  | Deprecated API | Referencing plugin(s) | Remove By |
  | ---------------|-----------|-----------|
  ${Object.keys(deprecationReferencesByApi)
    .sort((a, b) => {
      const aRemoveBy = deprecationReferencesByApi[a].deprecatedApi.removeBy ?? '';
      const bRemoveBy = deprecationReferencesByApi[b].deprecatedApi.removeBy ?? '';
      return aRemoveBy.localeCompare(bRemoveBy);
    })
    .map((key) => {
      const api = deprecationReferencesByApi[key].deprecatedApi;
      const pluginsReferencing: string[] = deprecationReferencesByApi[key].references.reduce(
        (acc, ref) => {
          if (acc.indexOf(ref.plugin) < 0) acc.push(ref.plugin);
          return acc;
        },
        [] as string[]
      );

      const deprecatedAPILink = `<DocLink id="${getPluginApiDocId(api.parentPluginId)}" section="${
        api.id
      }" text="${api.label}"/>`;

      const removeBy = api.removeBy ? api.removeBy : '-';

      return `| ${deprecatedAPILink} | ${pluginsReferencing.join(', ')} | ${removeBy} |`;
    })
    .join('\n')}
    `;

  const mdx = dedent(`
---
id: kibDevDocsDeprecationsByApi
slug: /kibana-dev-docs/api-meta/deprecated-api-list-by-api
title: Deprecated API usage by API
summary: A list of deprecated APIs, which plugins are still referencing them, and when they need to be removed by.
date: ${moment().format('YYYY-MM-DD')}
tags: ['contributor', 'dev', 'apidocs', 'kibana']
warning: This document is auto-generated and is meant to be viewed inside our experimental, new docs system.
---

## Referenced deprecated APIs

${tableMdx}   

## Unreferenced deprecated APIs

Safe to remove.

| Deprecated API |  Plugin Id |
| ---------------|------------|
${Object.values(unReferencedDeprecations)
  .map((apis) =>
    apis
      .map(
        (api) =>
          `| <DocLink id="${getPluginApiDocId(api.parentPluginId)}" section="${api.id}" text="${
            api.label
          }"/> | ${api.parentPluginId} | `
      )
      .join('\n')
  )
  .join('\n')}

`);

  fs.writeFileSync(Path.resolve(folder, 'deprecations_by_api.mdx'), mdx);
}
