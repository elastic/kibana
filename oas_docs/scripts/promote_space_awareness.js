/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../../src/setup_node_env');
const path = require('node:path');
const fs = require('node:fs');
const { run } = require('@kbn/dev-cli-runner');
const yaml = require('js-yaml');
const { REPO_ROOT } = require('@kbn/repo-info');

const NON_SPACE_PATH_PREFIXES = [
  ...new Set([
    '/api/upgrade_assistant',
    '/api/logstash/pipeline',
    '/api/logstash/pipelines',
    '/api/task_manager/_health',
    '/api/cases/reporters',
    '/api/encrypted_saved_objects/_rotate_key',
    '/api/short_url',
    '/api/features',
    '/api/status',
    '/api/security/role',
    '/api/spaces',
    '/api/security/session/_invalidate',
  ]),
];

const SPACE_PREFIX = '/s/';

/**
 * Takes a method and path, and returns a formatted HTML string for being displayed on our bump.sh site.
 * @param {string} method
 * @param {string} path
 * @returns string
 */
function getSpaceAlternatePathHtml(method, path) {
  return `<div><span class="operation-verb ${method.toLocaleLowerCase()}">${method}</span>&nbsp;<span class="operation-path">/s/{space_id}${path}</span></div>\n\nRefer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`;
}

run(
  async ({ log, flagsReader }) => {
    const [relativeFilePath] = flagsReader.getPositionals();
    const absPath = path.resolve(REPO_ROOT, relativeFilePath);
    const oasDoc = yaml.load(fs.readFileSync(absPath, 'utf8'));

    for (const [_pathName, pathValue] of Object.entries(oasDoc.paths)) {
      const pathName = _pathName.trim();
      log.debug(`Processing path: ${pathName}`);
      if (
        pathName.startsWith(SPACE_PREFIX) ||
        NON_SPACE_PATH_PREFIXES.some((nonSpacePrefix) => {
          return pathName.startsWith(nonSpacePrefix);
        })
      ) {
        log.debug(`Skipping path: ${pathName}.`);
        continue;
      }

      for (const [method, methodValue] of Object.entries(pathValue)) {
        methodValue.description = `**Spaces method and path for this operation:**\n\n${getSpaceAlternatePathHtml(
          method,
          pathName
        )}${methodValue.description ? '\n\n' + methodValue.description : ''}`;
      }
    }

    log.info(`Writing file with spaces promoted to ${absPath}`);
    fs.writeFileSync(absPath, yaml.dump(oasDoc, { noRefs: true, lineWidth: -1 }), 'utf8');
  },
  {
    description: 'Promote space awareness in OAS documents',
    usage: 'node scripts/promote_space_awareness.js <path-to-kbn-oas-file>',
  }
);
