/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { parse } from 'yaml';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { checkUnmappedUnions } from '../src/unmapped_unions';

const DEFAULT_OAS = resolve(REPO_ROOT, 'oas_docs/output/kibana.yaml');
const ACCEPTED_LIST = resolve(__dirname, '../src/accepted_json_leaves.json');
const ZOD_META = 'src/platform/packages/shared/kbn-zod/v4/terraform_meta.ts';
const CAPTURE_STEP = '.buildkite/scripts/steps/checks/capture_oas_snapshot.sh';
const UPDATE_COMMAND = 'node scripts/check_dashboard_terraform_mapping --update';

const entries = (locations: string[]) => locations.map((l) => `    "${l}",`).join('\n');

const unlistedMessage = (unlisted: string[], listPath: string) =>
  `${unlisted.length} location(s) in the Dashboards API would be exported as a JSON string in the ` +
  `elasticstack_kibana_dashboard resource without any annotation asking for it:\n\n` +
  `${unlisted.map((l) => `  - ${l}`).join('\n')}\n\n` +
  `Each is a union of objects with no Terraform variant mapping, or a property that variants merged into one ` +
  `Terraform object define differently. A location is an OpenAPI component (for merged variants, the merged ` +
  `union's component), then the property path inside it. For each, do one of:\n\n` +
  `  1. Map it: add tfUnion({ ... }) from @kbn/zod to the .meta() of the Zod union that produces the component ` +
  `(options are typed by TfUnionMeta in ${ZOD_META}), or make the merged variants agree. Then regenerate the ` +
  `published OpenAPI files: node scripts/capture_oas_snapshot with the --include-path flags of ${CAPTURE_STEP}, ` +
  `then make api-docs in oas_docs/ (on a PR, CI does this and commits the result).\n` +
  `  2. Accept the JSON string: run \`${UPDATE_COMMAND}\`, which adds these entries to ${listPath}:\n\n` +
  `${entries(unlisted)}\n`;

const staleMessage = (stale: string[], listPath: string) =>
  `${stale.length} entry(ies) of ${listPath} no longer become a JSON string by convention (mapped, renamed or ` +
  `removed). Run \`${UPDATE_COMMAND}\` to remove these entries:\n\n${entries(stale)}\n`;

run(
  ({ flags, log }) => {
    const { oas, accepted: acceptedFlag, update } = flags;
    const oasPath = typeof oas === 'string' && oas ? resolve(oas) : DEFAULT_OAS;
    const acceptedPath =
      typeof acceptedFlag === 'string' && acceptedFlag ? resolve(acceptedFlag) : ACCEPTED_LIST;
    const listPath = relative(REPO_ROOT, acceptedPath);

    const doc = parse(readFileSync(oasPath, 'utf8'));
    const accepted: string[] = JSON.parse(readFileSync(acceptedPath, 'utf8'));
    const { unlisted, stale } = checkUnmappedUnions(doc, accepted);

    if (update && (unlisted.length || stale.length)) {
      const staleSet = new Set(stale);
      const next = [...accepted.filter((entry) => !staleSet.has(entry)), ...unlisted].sort();
      writeFileSync(acceptedPath, `${JSON.stringify(next, null, 2)}\n`);
      log.success(
        `Updated ${listPath}: added ${unlisted.length}, removed ${stale.length}. Each added entry exports a ` +
          `location as a JSON string in Terraform; mapping it with tfUnion() is usually better.`
      );
      return;
    }

    const problems = [
      ...(unlisted.length ? [unlistedMessage(unlisted, listPath)] : []),
      ...(stale.length ? [staleMessage(stale, listPath)] : []),
    ];
    if (problems.length) throw createFailError(problems.join('\n'));

    log.success(
      `Every implicit JSON leaf in the dashboard resource is on ${listPath} (${accepted.length} accepted).`
    );
  },
  {
    description:
      'Fails when the Dashboards API would produce a JSON-string Terraform attribute that no annotation asked for ' +
      '(a union of objects with no tfUnion() mapping, or a property merged variants define differently) and that ' +
      'is not on the list of accepted JSON leaves.',
    flags: {
      string: ['oas', 'accepted'],
      boolean: ['update'],
      help: `
        --oas              OpenAPI document to check (default: oas_docs/output/kibana.yaml)
        --accepted         List of accepted JSON leaves (default: the checked-in list)
        --update           Add unlisted locations to the list and remove stale entries instead of failing
      `,
    },
  }
);
