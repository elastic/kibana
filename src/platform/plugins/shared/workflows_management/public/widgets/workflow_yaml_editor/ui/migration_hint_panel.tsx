/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiHorizontalRule,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { MigrationHint } from '../../../features/validate_workflow_yaml/lib/migration_hints';

interface OpenAgentChatOptions {
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
  sessionTag?: string;
}

interface MigrationHintPanelProps {
  hint: MigrationHint;
  isAiMigrationEnabled: boolean;
  onMigrateWithAi: (options?: OpenAgentChatOptions) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const MigrationHintPanel: React.FC<MigrationHintPanelProps> = ({
  hint,
  isAiMigrationEnabled,
  onMigrateWithAi,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { euiTheme } = useEuiTheme();

  const handleMigrateClick = useCallback(() => {
    onMigrateWithAi({
      initialMessage: `Perform the following migration on this workflow:\n\n${hint.hoverMessage.trimEnd()}`,
      autoSendInitialMessage: true,
      sessionTag: `workflow-migrate:${hint.id}`,
    });
  }, [onMigrateWithAi, hint.hoverMessage, hint.id]);

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow
      hasBorder
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      css={css({
        width: '420px',
        borderRadius: euiTheme.border.radius.medium,
      })}
      data-test-subj="migrationHintPanel"
    >
      <EuiText size="s">
        <strong>
          <FormattedMessage
            id="workflows.migrationHint.title"
            defaultMessage="Migration required"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiMarkdownFormat textSize="xs" color="subdued">
        {hint.hoverMessage.trimEnd()}
      </EuiMarkdownFormat>
      {isAiMigrationEnabled && (
        <>
          <EuiHorizontalRule margin="s" />
          <AiButton
            variant="outlined"
            size="s"
            iconType="sparkles"
            onClick={handleMigrateClick}
            css={css({ width: '100%' })}
            data-test-subj="migrationHintAiButton"
          >
            <FormattedMessage
              id="workflows.migrationHint.migrateWithAi"
              defaultMessage="Migrate with AI"
            />
          </AiButton>
        </>
      )}
    </EuiPanel>
  );
};
