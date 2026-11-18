/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AutoMigrationPanel } from './auto_migration_panel';

export interface CategoryTileLink {
  category: string;
  title: string;
  description: string;
  href: string;
  iconType: string;
  templateCount: number;
  visibleTags: string[];
  overflowTagCount: number;
}

export interface AgenticFirstEmptyStateProps {
  /** Category links into the filtered template library. None hides the row. */
  categoryTiles?: CategoryTileLink[];
  /** The prompt area, e.g. Agent Builder's chat input. Omitted when AI chat is unavailable. */
  agentInput?: React.ReactNode;
  /** Shows a link to the example workflows on GitHub, for when the library is off. */
  showExampleWorkflowsLink?: boolean;
  /** Disables "Start migration" when the user cannot create workflows. */
  canCreateWorkflow?: boolean;
  /** Auto migration is its own empty-state scenario, not part of the LLM landings. */
  showAutoMigration?: boolean;
  onStartManually?: () => void;
  onExploreLibrary?: () => void;
}

const EXAMPLE_WORKFLOWS_URL = 'https://github.com/elastic/workflows';

function CategoryTileTitle({ tile }: { tile: CategoryTileLink }) {
  const { euiTheme } = useEuiTheme();
  // EuiText size m and semiBold, same as the library template card title.
  // Spans keep the row valid inside the card title.
  return (
    <span
      css={css`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: ${euiTheme.size.m};
      `}
    >
      <EuiIcon
        type={tile.iconType}
        size="m"
        color="text"
        data-test-subj={`workflowCategoryTileIcon-${tile.category}`}
      />
      <span
        css={css`
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: ${euiTheme.size.s};
          width: 100%;
        `}
      >
        <EuiText
          component="span"
          size="m"
          css={css`
            flex: 1;
            min-width: 0;
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {tile.title}
        </EuiText>
        <EuiNotificationBadge
          size="m"
          color="subdued"
          data-test-subj={`workflowCategoryTileCount-${tile.category}`}
        >
          {tile.templateCount}
        </EuiNotificationBadge>
      </span>
    </span>
  );
}

function CategoryTileTags({ tile }: { tile: CategoryTileLink }) {
  const { euiTheme } = useEuiTheme();
  if (tile.visibleTags.length === 0) {
    return null;
  }
  // One row, same as the library template card. The column is wide enough
  // for three badges, so the row does not wrap or get clipped.
  return (
    <span
      css={css`
        display: flex;
        flex-wrap: nowrap;
        gap: ${euiTheme.size.xs};
        max-width: 100%;
      `}
    >
      {tile.visibleTags.map((tag) => (
        <EuiBadge key={tag} color="hollow">
          {tag}
        </EuiBadge>
      ))}
      {tile.overflowTagCount > 0 && (
        <EuiBadge color="hollow">{`+${tile.overflowTagCount}`}</EuiBadge>
      )}
    </span>
  );
}

export function AgenticFirstEmptyState({
  categoryTiles,
  agentInput,
  showExampleWorkflowsLink = false,
  canCreateWorkflow = true,
  showAutoMigration = false,
  onStartManually,
  onExploreLibrary,
}: AgenticFirstEmptyStateProps) {
  const visibleTiles = categoryTiles ?? [];
  const { euiTheme } = useEuiTheme();
  const containerCss = css`
    width: 100%;
    padding: ${euiTheme.size.xl} ${euiTheme.size.l};
  `;

  return (
    <div css={containerCss} data-test-subj="agenticFirstEmptyState">
      <div
        css={css`
          /* Three catalog cards. A library card is about 283px; 300px keeps
             three tags on one line, and the prompt above uses this same width. */
          max-width: calc(300px * 3 + ${euiTheme.size.base} * 2);
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

        {showAutoMigration && (
          <>
            <EuiSpacer size="m" />
            <AutoMigrationPanel canCreateWorkflow={canCreateWorkflow} />
          </>
        )}

        {visibleTiles.length > 0 && (
          <>
            <EuiSpacer size="xxl" />

            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('workflows.agenticFirst.templateLabel', {
                    defaultMessage: 'Start automating from an existing template',
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
              {visibleTiles.map((tile) => (
                <EuiFlexItem
                  key={tile.category}
                  grow={1}
                  css={css`
                    flex-basis: 0;
                    min-width: 0;
                    & > * {
                      height: 100%;
                    }
                  `}
                >
                  <EuiCard
                    layout="vertical"
                    textAlign="left"
                    paddingSize="l"
                    hasBorder
                    href={tile.href}
                    title={<CategoryTileTitle tile={tile} />}
                    description={tile.description}
                    footer={<CategoryTileTags tile={tile} />}
                    css={css`
                      width: 100%;
                      min-width: 0;
                      [class*='euiCard__footer'] {
                        max-width: 100%;
                      }
                    `}
                    data-test-subj={`workflowCategoryTile-${tile.category}`}
                  />
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
