/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../../context_awareness';
import { SECURITY_PROFILE_ID } from '../../../../context_awareness/profile_providers/security/constants';

export type ActiveSolution = 'observability' | 'security';

/**
 * Returns the solution whose profile is active in Classic navigation, or undefined when none is.
 * Observability covers the logs (base + integrations) and traces data source profiles; Security
 * covers the security data source profile. Common profiles (e.g. deprecation-logs, metrics) resolve
 * to undefined even when they reuse a solution category.
 */
export const getActiveSolutionProfile = ({
  solutionType,
  dataSourceProfileId,
}: {
  solutionType: SolutionType;
  dataSourceProfileId: string;
}): ActiveSolution | undefined => {
  if (solutionType !== SolutionType.Default) {
    return undefined;
  }

  if (dataSourceProfileId === SECURITY_PROFILE_ID.dataSource) {
    return 'security';
  }

  if (
    dataSourceProfileId.startsWith('observability-') &&
    dataSourceProfileId.endsWith('-data-source-profile')
  ) {
    return 'observability';
  }

  return undefined;
};
