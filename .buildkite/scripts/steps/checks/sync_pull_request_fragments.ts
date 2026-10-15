/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import {
  listPullRequestYamlNames,
  syncFragmentRegistry,
} from '../../../pipeline-utils/step-library/sync_fragments.ts';
import { getKibanaDir } from '#pipeline-utils/get_kibana_dir';

const root = getKibanaDir();
const file = path.join(root, '.buildkite/pipeline-utils/step-library/fragments.ts');

fs.writeFileSync(
  file,
  syncFragmentRegistry(fs.readFileSync(file, 'utf8'), listPullRequestYamlNames(root))
);
