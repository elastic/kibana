/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { UNKNOWN_OWNER_LABEL, getDependencyOwnership } from './dependency_ownership';

run(
  ({ log }) => {
    const ownershipData = getDependencyOwnership();
    const uncoveredDependencies = ownershipData.filter(
      ({ owner }) => owner === UNKNOWN_OWNER_LABEL
    );

    if (uncoveredDependencies.length > 0) {
      const dependenciesAsList = uncoveredDependencies
        .map((d) => `${d.dependency} [scope: ${d.scope}]`)
        .join('\n - ');

      const errorMessage = `The following dependencies are not covered by renovate.json rules:\n - ${dependenciesAsList}`;
      throw createFailError(
        `${errorMessage}\n\nPlease add rules to renovate.json to cover these dependencies.`
      );
    }

    log.success('All dependencies are covered by renovate.json rules');
  },
  {
    usage: 'node scripts/check_dependency_ownership',
    description: 'Check if all dependencies are covered by renovate.json rules',
  }
);
