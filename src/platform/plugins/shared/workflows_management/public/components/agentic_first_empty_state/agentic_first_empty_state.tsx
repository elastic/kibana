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
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
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

export interface AgenticFirstExample {
  id: string;
  title: string;
  description: string;
  icons?: string[];
}

export interface AgenticFirstEmptyStateProps {
  /** Fallback example cards used when no live templates are supplied (e.g. Storybook). */
  examples?: AgenticFirstExample[];
  /**
   * Live templates from the Workflow Template Library. When provided (typically from
   * `useCatalog()` behind `useLibraryEnabled()`), the first three replace the mock cards.
   */
  liveTemplates?: Template[];
  /** The prompt area, e.g. Agent Builder's chat input. Omitted when AI chat is unavailable. */
  agentInput?: React.ReactNode;
  onStartManually?: () => void;
  onExploreLibrary?: () => void;
  onSelectExample?: (id: string) => void;
  onSelectTemplate?: (template: Template) => void;
}

const DEFAULT_EXAMPLES: AgenticFirstExample[] = [
  {
    id: 'call-subagent',
    title: i18n.translate('workflows.agenticFirst.example.callSubagent.title', {
      defaultMessage: 'Call subagent workflow',
    }),
    description: i18n.translate('workflows.agenticFirst.example.callSubagent.description', {
      defaultMessage: 'Call a subagent workflow to convert data between formats.',
    }),
    icons: ['logoElastic', 'console', 'logoGithub'],
  },
  {
    id: 'get-document',
    title: i18n.translate('workflows.agenticFirst.example.getDocument.title', {
      defaultMessage: 'Get document',
    }),
    description: i18n.translate('workflows.agenticFirst.example.getDocument.description', {
      defaultMessage: 'Get a document by ID and index name.',
    }),
    icons: ['logoSlack'],
  },
  {
    id: 'rss-feed',
    title: i18n.translate('workflows.agenticFirst.example.rss.title', {
      defaultMessage: 'RSS feed ingest',
    }),
    description: i18n.translate('workflows.agenticFirst.example.rss.description', {
      defaultMessage: 'Poll an RSS feed and ingest new items into Elasticsearch.',
    }),
    icons: ['refresh', 'globe', 'logoElastic'],
  },
];

export function AgenticFirstEmptyState({
  examples = DEFAULT_EXAMPLES,
  liveTemplates,
  agentInput,
  onStartManually,
  onExploreLibrary,
  onSelectExample,
  onSelectTemplate,
}: AgenticFirstEmptyStateProps) {
  const visibleTemplates = liveTemplates?.slice(0, 3) ?? [];
  const showLiveTemplates = visibleTemplates.length > 0;
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
          {showLiveTemplates
            ? visibleTemplates.map((template) => (
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
              ))
            : examples.map((example) => (
                <EuiFlexItem
                  key={example.id}
                  grow={1}
                  css={css`
                    flex-basis: 0;
                    min-width: 0;
                  `}
                >
                  <EuiCard
                    textAlign="left"
                    paddingSize="m"
                    hasBorder
                    title={
                      <EuiText size="s">
                        <strong>{example.title}</strong>
                      </EuiText>
                    }
                    description={
                      <EuiText size="xs" color="subdued">
                        {example.description}
                      </EuiText>
                    }
                    icon={
                      example.icons && example.icons.length > 0 ? (
                        <EuiFlexGroup gutterSize="xs" responsive={false}>
                          {example.icons.map((icon, idx) => (
                            <EuiFlexItem grow={false} key={idx}>
                              <EuiIcon type={icon} size="m" aria-hidden={true} />
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                      ) : undefined
                    }
                    onClick={() => onSelectExample?.(example.id)}
                    data-test-subj={`agenticFirstExampleCard-${example.id}`}
                  />
                </EuiFlexItem>
              ))}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="flexStart">
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
        </EuiFlexGroup>
      </div>
    </div>
  );
}
