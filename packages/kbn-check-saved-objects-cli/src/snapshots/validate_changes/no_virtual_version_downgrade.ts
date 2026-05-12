/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lt } from 'semver';
import type { MigrationInfoRecord, MigrationSnapshot } from '../../types';

const DEFAULT_VIRTUAL_VERSION = '10.0.0';

export function getVirtualVersionFromRecord(record: MigrationInfoRecord | undefined): string {
  if (!record?.modelVersions?.length) {
    return DEFAULT_VIRTUAL_VERSION;
  }
  const latest = record.modelVersions.reduce((max, { version }) => {
    const parsed = Number(version);
    return parsed > max ? parsed : max;
  }, 0);
  return latest === 0 ? DEFAULT_VIRTUAL_VERSION : `10.${latest}.0`;
}

interface ValidateNoVirtualVersionDowngradeParams {
  from: MigrationSnapshot;
  to: MigrationSnapshot;
}

export function validateNoVirtualVersionDowngrade({
  from,
  to,
}: ValidateNoVirtualVersionDowngradeParams): void {
  const downgrades: Array<{ name: string; from: string; to: string }> = [];

  for (const name of Object.keys(to.typeDefinitions)) {
    const fromVersion = getVirtualVersionFromRecord(from.typeDefinitions[name]);
    const toVersion = getVirtualVersionFromRecord(to.typeDefinitions[name]);

    if (lt(toVersion, fromVersion)) {
      downgrades.push({ name, from: fromVersion, to: toVersion });
    }
  }

  if (downgrades.length > 0) {
    const details = downgrades.map((d) => `  - '${d.name}': ${d.from} => ${d.to}`).join('\n');
    throw new Error(
      `❌ Virtual version downgrade detected for the following SO type(s). Existing entries' semvers must never be downgraded:\n${details}`
    );
  }
}
