/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import dedent from 'dedent';
import fs from 'fs';
import Path from 'path';
import { ReferencedDeprecations } from '../types';
import { getPluginApiDocId } from '../utils';

export function writeDeprecationDoc(
  folder: string,
  deprecations: ReferencedDeprecations,
  log: ToolingLog
): void {
  const tableMdx = Object.keys(deprecations)
    .sort()
    .map((key) => {
      return `
    ## ${key}
    
    | Deprecated API | Reference location | Remove By |
    | ---------------|-----------|-----------|
    ${deprecations[key]
      .map((dep) => {
        const path = dep.ref.link.path;
        return `| <DocLink id="${getPluginApiDocId(dep.deprecatedApi.parentPluginId)}" section="${
          dep.deprecatedApi.id
        }" text="${dep.deprecatedApi.label}"/> | [${path.substr(path.lastIndexOf(Path.sep) + 1)}#L${
          dep.ref.link.lineNumber
        }](https://github.com/elastic/kibana/tree/master/${path}#L${dep.ref.link.lineNumber}) | ${
          dep.deprecatedApi.removeBy ? dep.deprecatedApi.removeBy : '-'
        } |`;
      })
      .join('\n')}
    `;
    })
    .join('\n\n');

  const mdx = dedent(`
---
id: kibDevDocsDeprecations
slug: /kibana-dev-docs/deprecated-api-list
title: Deprecated API usage
summary: A list of deprecated APIs, which plugins are still referencing them, and when they need to be removed by.
date: 2021-05-02
tags: ['contributor', 'dev', 'apidocs', 'kibana']
warning: This document is auto-generated and is meant to be viewed inside our experimental, new docs system.
---

${tableMdx}   

`);

  fs.writeFileSync(Path.resolve(folder, 'deprecations.mdx'), mdx);
}
