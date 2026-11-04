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
import { parse } from 'yaml';
import { renderSteps } from './render.ts';
import { normalizeSemantics } from './semantic_normalization.ts';
import type { Step } from './types.ts';
import { getKibanaDir } from '#pipeline-utils/get_kibana_dir';

export interface Fragment {
  // Path under `.buildkite/pipelines/` without the extension. Also the snapshot name.
  name: string;
  // Repo-relative path of the YAML fragment. The file is deleted once `steps` is set.
  yamlPath: string;
  // Set once the fragment is ported to TypeScript.
  steps?: () => readonly Step[];
  // The document's top-level `env`, for a fragment that sets one.
  env?: Readonly<Record<string, string>>;
}

export const yamlFragment = (name: string): Fragment => ({
  name,
  yamlPath: `.buildkite/pipelines/${name}.yml`,
});

// The registry sync tool parses one entry per line, and needs the array's opening and closing
// lines as they are. A fragment ported to TypeScript is registered here with its `steps`:
//   { ...yamlFragment('pull_request/name'), steps: nameSteps },
// prettier-ignore
export const FRAGMENTS: readonly Fragment[] = [
];

// The parsed, semantically normalized document of a fragment: from its TypeScript function once it
// has one, from its YAML file until then.
export const loadFragmentDocument = (fragment: Fragment): unknown =>
  normalizeSemantics(
    fragment.steps
      ? parse(renderSteps(fragment.steps(), { header: true, env: fragment.env }))
      : parse(fs.readFileSync(path.join(getKibanaDir(), fragment.yamlPath), 'utf8'))
  );
