/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import { buildThreatDescription } from '@kbn/security-solution-common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { MITRE_ATTACK_DETAILS_TEST_ID, MITRE_ATTACK_TITLE_TEST_ID } from '../test_ids';

/**
 * Retrieves mitre attack information from the alert information
 */
const getMitreComponentParts = (hit?: DataTableRecord) => {
  const ruleParameters = hit?.raw?.fields['kibana.alert.rule.parameters'] || null;
  const threat: Threat = ruleParameters ? ruleParameters[0]?.threat : null;
  if (!threat) {
    return null;
  }

  const threats: Threats = Array.isArray(threat) ? (threat as Threats) : ([threat] as Threats);
  return buildThreatDescription({
    label: threats[0].framework,
    threat: threats,
  });
};

export interface MitreAttackProps {
  hit: DataTableRecord;
}

export const MitreAttack: FC<MitreAttackProps> = ({ hit }) => {
  const threatDetails = useMemo(() => getMitreComponentParts(hit), [hit]);

  if (!threatDetails || !threatDetails[0]) {
    // Do not render empty message on MITRE attack because other frameworks could be used
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiSpacer size="m" />
      <EuiFlexItem data-test-subj={MITRE_ATTACK_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>{threatDetails[0].title}</h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={MITRE_ATTACK_DETAILS_TEST_ID}>
        {threatDetails[0].description}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

MitreAttack.displayName = 'MitreAttack';
