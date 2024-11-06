/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');

const { REPO_ROOT } = require('@kbn/repo-info');

require('@kbn/babel-register').install({
  only: [
    'test',
    'x-pack/test',
    'examples',
    'x-pack/examples',
    // TODO: should should probably remove this link back to the source
    'x-pack/plugins/task_manager/server/config.ts',
    'src/plugins/field_formats/common',
    'packages',
    'x-pack/packages',
  ].map((path) => Path.resolve(REPO_ROOT, path)),
});
