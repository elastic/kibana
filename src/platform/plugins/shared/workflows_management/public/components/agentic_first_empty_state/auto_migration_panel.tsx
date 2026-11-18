/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { simplify } from '@elastic/eui-illustrations';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

/**
 * Provisional migration page. Replace this when the real address is known.
 * "Start migration" opens it in a new tab.
 */
export const AUTO_MIGRATION_HREF = 'https://example.invalid/workflows/migrate';

export interface AutoMigrationPanelProps {
  canCreateWorkflow: boolean;
}

/** Lighter companion to the connect-LLM panel, between it and the template cards. */
export const AutoMigrationPanel = ({ canCreateWorkflow }: AutoMigrationPanelProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="agenticFirstAutoMigrationPanel">
    <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIllustration type={simplify} alt="" css={{ width: 64, height: 64 }} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="workflows.agenticFirst.autoMigration.title"
              defaultMessage="Coming from another tool?"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="workflows.agenticFirst.autoMigration.description"
              defaultMessage="Bring your existing automations into Workflows."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          href={canCreateWorkflow ? AUTO_MIGRATION_HREF : undefined}
          target="_blank"
          iconType="external"
          iconSide="right"
          isDisabled={!canCreateWorkflow}
          data-test-subj="agenticFirstAutoMigrationButton"
        >
          <FormattedMessage
            id="workflows.agenticFirst.autoMigration.startButton"
            defaultMessage="Start migration"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
