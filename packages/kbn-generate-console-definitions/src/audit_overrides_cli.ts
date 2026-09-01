/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  compareOverrideAuditStates,
  createOverrideAuditState,
  formatOverrideAuditDiff,
  hasOverrideAuditChanges,
  OVERRIDE_AUDIT_BASELINE_FILE,
  readOverrideAuditState,
  writeOverrideAuditState,
} from './audit_overrides';
import {
  CONSOLE_DEFINITIONS_FOLDER,
  GENERATED_SUBFOLDER,
  OVERRIDES_SUBFOLDER,
} from './console_definition_paths';

export const auditConsoleDefinitionOverrides = ({
  generatedFolder,
  updateOverrideAudit,
  log,
}: {
  generatedFolder: string;
  updateOverrideAudit: boolean;
  log: ToolingLog;
}) => {
  const auditState = createOverrideAuditState({
    generatedFolder,
    overridesFolder: Path.resolve(CONSOLE_DEFINITIONS_FOLDER, OVERRIDES_SUBFOLDER),
  });
  if (auditState.orphanOverrides.length > 0) {
    throw createFlagError(
      `Override files without generated definitions are never loaded:\n${auditState.orphanOverrides
        .map((file) => `  - ${file}`)
        .join('\n')}`
    );
  }
  if (updateOverrideAudit) {
    writeOverrideAuditState(OVERRIDE_AUDIT_BASELINE_FILE, auditState);
    log.warning(`updated override conflict baseline ${OVERRIDE_AUDIT_BASELINE_FILE}`);
    return;
  }
  const auditDiff = compareOverrideAuditStates(
    readOverrideAuditState(OVERRIDE_AUDIT_BASELINE_FILE),
    auditState
  );
  if (hasOverrideAuditChanges(auditDiff)) {
    throw createFlagError(
      `Generated definitions changed curated override conflicts:\n\n${formatOverrideAuditDiff(
        auditDiff
      )}\n\nReview each conflict, then rerun with --updateOverrideAudit if every change is intentional.`
    );
  }
  log.info(`override conflict audit passed`);
};

export function runAuditConsoleDefinitionOverridesCli() {
  run(
    ({ log, flags }) => {
      const generatedFolder = flags.dest
        ? Path.resolve(REPO_ROOT, `${flags.dest}`)
        : Path.resolve(CONSOLE_DEFINITIONS_FOLDER, GENERATED_SUBFOLDER);
      auditConsoleDefinitionOverrides({
        generatedFolder,
        updateOverrideAudit: Boolean(flags.updateOverrideAudit),
        log,
      });
    },
    {
      description: `Audit generated Console body rules replaced by curated overrides`,
      usage: `
node scripts/audit_console_definition_overrides.js
node scripts/audit_console_definition_overrides.js [--dest <DEFINITIONS_FOLDER>] [--updateOverrideAudit]
`,
      flags: {
        string: ['dest'],
        boolean: ['updateOverrideAudit'],
        help: `
--dest          Generated definitions folder to audit (relative to the Kibana repo root)
--updateOverrideAudit
                Update the approved generated/override conflict baseline after reviewing every reported change
`,
      },
    }
  );
}
