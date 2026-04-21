/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { TerraformImpactResult } from '../terraform/check_terraform_impact';

export const writeImpactReport = (
  reportPath: string,
  terraformImpact: TerraformImpactResult
): void => {
  const report = {
    impactedChanges: terraformImpact.impactedChanges.map((impact) => ({
      path: impact.change.path,
      method: impact.change.method,
      reason: impact.change.reason,
      terraformResource: impact.terraformResource,
      owners: impact.owners,
    })),
  };
  mkdirSync(resolve(reportPath, '..'), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
};
