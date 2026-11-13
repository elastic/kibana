/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { parseDocument } from 'yaml';
import { getStepFragment } from './yaml_mutations';

/**
 * The open step as the YAML now has it, when something other than this session changed it (an
 * undo, an edit in the YAML tab), or `undefined` when there is nothing to adopt: the YAML is what
 * this session last wrote, the step is gone, or it is the same step (comments and key order do
 * not make a different one).
 */
export const resolveExternalStepFragment = ({
  editorYaml,
  stepName,
  lastAppliedYaml,
  lastAppliedFragment,
}: {
  readonly editorYaml: string;
  readonly stepName: string;
  /** The full YAML right after this session's last own write. */
  readonly lastAppliedYaml: string | null;
  /** The step fragment this session last applied, or opened with. */
  readonly lastAppliedFragment: string | null;
}): string | undefined => {
  if (editorYaml === lastAppliedYaml || lastAppliedFragment === null) return undefined;
  const live = getStepFragment(editorYaml, stepName);
  if (live === undefined) return undefined;
  const sameStep = isEqual(parseDocument(live).toJS(), parseDocument(lastAppliedFragment).toJS());
  return sameStep ? undefined : live;
};
