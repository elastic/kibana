/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

import { getAllDocFileIds } from './mdx/get_all_doc_file_ids';

interface NavEntry {
  id?: string;
  items?: NavEntry[];
}

export async function trimDeletedDocsFromNav(
  log: ToolingLog,
  initialDocIds: string[],
  outputDir: string
) {
  const generatedDocIds = await getAllDocFileIds(outputDir);
  const deleted = initialDocIds.filter((id) => !generatedDocIds.includes(id));
  if (!deleted.length) {
    log.info('no deleted doc files detected');
  }

  const navPath = Path.resolve(REPO_ROOT, 'dev_docs/nav-kibana-dev.docnav.json');

  let navJson;
  try {
    navJson = await Fsp.readFile(navPath, 'utf8');
  } catch (error) {
    throw new Error(`unable to read dev-docs nav at ${navPath}: ${error.message}`);
  }

  let nav;
  try {
    nav = JSON.parse(navJson);
  } catch (error) {
    throw new Error(`unable to parse nav at ${navPath}: ${error.message}`);
  }

  let updatedNav = false;
  (function recurse(entry: NavEntry, parent?: NavEntry): void {
    if (parent && typeof entry.id === 'string' && deleted.includes(entry.id)) {
      updatedNav = true;
      parent.items = parent.items?.filter((i) => i !== entry);
      return;
    }

    if (entry.items) {
      for (const item of entry.items) {
        recurse(item, entry);
      }
    }
  })(nav);

  if (updatedNav) {
    log.info('updating docs nav to remove references to deleted pages');
    await Fsp.writeFile(
      navPath,
      JSON.stringify(nav, null, 2) + (navJson.endsWith('\n') ? '\n' : '')
    );
  }
}
