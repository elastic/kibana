/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MigrationHint } from '../../../features/validate_workflow_yaml/lib/migration_hints';

interface OpenAgentChatOptions {
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
  sessionTag?: string;
}

interface MigrationWarningBannerProps {
  matchedLines: Map<number, MigrationHint[]>;
  isAiMigrationEnabled: boolean;
  onMigrateWithAi: (options?: OpenAgentChatOptions) => void;
  onLineClick: (lineNumber: number) => void;
}

export const MigrationWarningBanner: React.FC<MigrationWarningBannerProps> = ({
  matchedLines,
  isAiMigrationEnabled,
  onMigrateWithAi,
  onLineClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const handleLineClick = useCallback(
    (lineNumber: number) => () => onLineClick(lineNumber),
    [onLineClick]
  );

  const uniqueHints = useMemo(() => {
    const seen = new Set<string>();
    const result: MigrationHint[] = [];
    for (const hints of matchedLines.values()) {
      for (const hint of hints) {
        if (!seen.has(hint.id)) {
          seen.add(hint.id);
          result.push(hint);
        }
      }
    }
    return result;
  }, [matchedLines]);

  const handleMigrateClick = useCallback(() => {
    const combinedMessage = uniqueHints.map((h) => h.description).join('\n\n---\n\n');
    const sessionTag = `workflow-migrate-all:${uniqueHints.map((h) => h.id).join('+')}`;
    onMigrateWithAi({
      initialMessage: `Perform all the following migrations on this workflow:\n\n${combinedMessage}`,
      autoSendInitialMessage: true,
      sessionTag,
    });
  }, [onMigrateWithAi, uniqueHints]);

  if (matchedLines.size === 0) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      size="s"
      css={css({ flexShrink: 0, margin: `${euiTheme.size.m} ${euiTheme.size.m} 0` })}
      title={
        <FormattedMessage
          id="workflows.migrationWarningBanner.title"
          defaultMessage="Migration required"
        />
      }
      data-test-subj="migrationWarningBanner"
    >
      <EuiText size="xs">
        <ul css={css({ listStyle: 'none', padding: 0, margin: 0 })}>
          {Array.from(matchedLines.entries()).map(([lineNumber, hints]) =>
            hints.map((hint) => (
              <li key={`${lineNumber}-${hint.id}`} css={css({ marginBottom: euiTheme.size.xxs })}>
                {hint.name}
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  onClick={handleLineClick(lineNumber)}
                  css={css({
                    marginLeft: euiTheme.size.xs,
                    minInlineSize: 'auto',
                    height: 'auto',
                  })}
                  data-test-subj={`migrationWarningBannerLine-${lineNumber}`}
                >
                  {`L${lineNumber}`}
                </EuiButtonEmpty>
              </li>
            ))
          )}
        </ul>
      </EuiText>
      {isAiMigrationEnabled && (
        <>
          <EuiSpacer size="s" />
          <EuiButton
            fill
            color="warning"
            size="s"
            iconType="sparkles"
            onClick={handleMigrateClick}
            data-test-subj="migrationWarningBannerAiButton"
          >
            <FormattedMessage
              id="workflows.migrationWarningBanner.migrateWithAi"
              defaultMessage="Migrate with AI"
            />
          </EuiButton>
        </>
      )}
    </EuiCallOut>
  );
};
