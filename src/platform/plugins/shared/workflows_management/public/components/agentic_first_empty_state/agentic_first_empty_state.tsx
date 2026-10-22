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
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';
import { TemplateCard } from '@kbn/workflows-ui';

export interface AgenticFirstEmptyStateProps {
  /** Workflow Template library templates. The first three show as cards; none hides the row. */
  templates?: Template[];
  /** The prompt area, e.g. Agent Builder's chat input. Omitted when AI chat is unavailable. */
  agentInput?: React.ReactNode;
  /** Shows a link to the example workflows on GitHub, for when the library is off. */
  showExampleWorkflowsLink?: boolean;
  onStartManually?: () => void;
  onExploreLibrary?: () => void;
  onSelectTemplate?: (template: Template) => void;
}

const EXAMPLE_WORKFLOWS_URL = 'https://github.com/elastic/workflows';

export function AgenticFirstEmptyState({
  templates,
  agentInput,
  showExampleWorkflowsLink = false,
  onStartManually,
  onExploreLibrary,
  onSelectTemplate,
}: AgenticFirstEmptyStateProps) {
  const visibleTemplates = templates?.slice(0, 3) ?? [];
  const { euiTheme } = useEuiTheme();
  const containerCss = css`
    width: 100%;
    padding: ${euiTheme.size.xl} ${euiTheme.size.l};
  `;

  return (
    <div css={containerCss} data-test-subj="agenticFirstEmptyState">
      <div
        css={css`
          max-width: 760px;
          margin: 0 auto;
        `}
      >
        <EuiTitle size="m">
          <h2
            css={css`
              text-align: center;
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {i18n.translate('workflows.agenticFirst.title', {
              defaultMessage: 'What do you want to automate?',
            })}
          </h2>
        </EuiTitle>

        {agentInput && (
          <>
            {/* Matches the title-to-input gap on the Agent Builder new-chat screen. */}
            <EuiSpacer size="l" />
            <div data-test-subj="agenticFirstAgentInput">{agentInput}</div>
          </>
        )}

        {visibleTemplates.length > 0 && (
          <>
            <EuiSpacer size="xxl" />

            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('workflows.agenticFirst.exampleLabel', {
                    defaultMessage: 'Start from an existing example',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink onClick={onExploreLibrary} data-test-subj="agenticFirstExploreLibraryLink">
                  {i18n.translate('workflows.agenticFirst.exploreLibrary', {
                    defaultMessage: 'Explore library',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EuiFlexGroup gutterSize="m" responsive={false}>
              {visibleTemplates.map((template) => (
                <EuiFlexItem
                  key={template.slug}
                  grow={1}
                  css={css`
                    flex-basis: 0;
                    min-width: 0;
                    & > * {
                      height: 100%;
                    }
                  `}
                >
                  <TemplateCard template={template} onSelect={(t) => onSelectTemplate?.(t)} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="sortRight"
              iconSide="right"
              onClick={onStartManually}
              data-test-subj="agenticFirstStartManuallyButton"
            >
              {i18n.translate('workflows.agenticFirst.startManually', {
                defaultMessage: 'Start manually',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {showExampleWorkflowsLink && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href={EXAMPLE_WORKFLOWS_URL}
                target="_blank"
                iconType="external"
                iconSide="right"
                data-test-subj="agenticFirstExampleWorkflowsLink"
              >
                {i18n.translate('workflows.agenticFirst.exampleWorkflows', {
                  defaultMessage: 'Example workflows',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </div>
  );
}
