/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MILESTONE_LABEL = i18n.translate('core.ui.chrome.milestone.label', {
  defaultMessage: 'V1 Milestone',
});

const MILESTONE_DESCRIPTION = i18n.translate('core.ui.chrome.milestone.description', {
  defaultMessage: 'UX prototype using hardcoded data. Limited capabilities.',
});

const READ_MORE_LABEL = i18n.translate('core.ui.chrome.milestone.readMoreLabel', {
  defaultMessage: 'Read more',
});

export const MILESTONE_PANEL_HEIGHT_PX = 36;

const useMilestoneStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      bar: css`
        display: flex;
        align-items: center;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        min-height: ${MILESTONE_PANEL_HEIGHT_PX}px;
        gap: ${euiTheme.size.s};
        padding: 0 ${euiTheme.size.m};
        background-color: ${euiTheme.colors.backgroundBaseInteractiveHoverAssistance};
        color: ${euiTheme.colors.textAssistance};
      `,
      text: css`
        min-width: 0;
        flex: 1 1 auto;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `,
      readMore: css`
        flex-shrink: 0;
      `,
    }),
    [euiTheme]
  );
};

/**
 * A prototype milestone panel rendered in the chrome banner slot, above the
 * global header. It spans the full viewport width and opens a flyout with
 * details about the prototype's scope and limitations.
 */
export const MilestoneBadge = React.memo(() => {
  const styles = useMilestoneStyles();
  const { euiTheme } = useEuiTheme();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'chromeMilestoneFlyout' });

  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  return (
    <>
      <div css={styles.bar} data-test-subj="chromeNextGlobalHeaderMilestone">
        <EuiIcon type="flask" size="s" color={euiTheme.colors.textAssistance} aria-hidden />
        <EuiText size="xs" color={euiTheme.colors.textAssistance} css={styles.text}>
          <strong>{MILESTONE_LABEL}</strong>
          {' — '}
          {MILESTONE_DESCRIPTION}
        </EuiText>
        <EuiButtonEmpty
          size="xs"
          flush="both"
          onClick={openFlyout}
          css={styles.readMore}
          data-test-subj="chromeNextGlobalHeaderMilestoneReadMore"
        >
          {READ_MORE_LABEL}
        </EuiButtonEmpty>
      </div>

      {isFlyoutOpen && (
        <EuiFlyout
          onClose={closeFlyout}
          size="s"
          resizable
          aria-labelledby={flyoutTitleId}
          data-test-subj="chromeNextGlobalHeaderMilestoneFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiBadge color="hollow" iconType="flask">
              {MILESTONE_LABEL}
            </EuiBadge>
            <EuiSpacer size="s" />
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>
                {i18n.translate('core.ui.chrome.milestone.flyoutTitle', {
                  defaultMessage: 'About this prototype',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText size="s">
              <p>
                {i18n.translate('core.ui.chrome.milestone.flyoutIntro', {
                  defaultMessage:
                    'This is an early UX prototype. It exists to explore and gather feedback on the interaction design — not to demonstrate a fully working product.',
                })}
              </p>

              <h3>
                {i18n.translate('core.ui.chrome.milestone.flyoutValueHeading', {
                  defaultMessage: 'What V1 delivers',
                })}
              </h3>
              <p>
                {i18n.translate('core.ui.chrome.milestone.flyoutValueBody', {
                  defaultMessage:
                    'Existing Streams users get multi-step processing for the first time and can chain as many Streamlang steps as needed. Anyone sending data through managed inputs (OTLP, PRW, _bulk) can now route, filter, and process data before it hits Elasticsearch. Pipeline telemetry — throughput, error rate, and latency — is visible directly on the canvas.',
                })}
              </p>

              <h3>
                {i18n.translate('core.ui.chrome.milestone.flyoutShipsHeading', {
                  defaultMessage: 'Ships in V1',
                })}
              </h3>

              <h4>
                {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralHeading', {
                  defaultMessage: 'General',
                })}
              </h4>
              <ul>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralCanvas', {
                    defaultMessage:
                      'Canvas experience: move nodes around, add routing and processing between nodes, drag-to-create, hold-shift-to-select, and more.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralTableFilter', {
                    defaultMessage: 'Filtering in table mode (boolean, scopes).',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralMapSearch', {
                    defaultMessage: 'Search and filtering in the streams map.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralImportExport', {
                    defaultMessage: 'Export and import a stream definition.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralIngestPipelines', {
                    defaultMessage:
                      'Ingest pipelines on existing streams folded into the destination node (not the processing layer); they run in Elasticsearch.',
                  })}
                </li>
                <li>
                  {i18n.translate(
                    'core.ui.chrome.milestone.flyoutShipsGeneralIntegrationProcessing',
                    {
                      defaultMessage: 'Built-in integration processing.',
                    }
                  )}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralManagedProcessing', {
                    defaultMessage: 'Managed processing.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralMultiSource', {
                    defaultMessage: 'Multiple source instances with per-source auth.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsGeneralExistingStreams', {
                    defaultMessage: 'Existing streams surfaced on the canvas.',
                  })}
                </li>
              </ul>

              <h4>
                {i18n.translate('core.ui.chrome.milestone.flyoutShipsSourcesHeading', {
                  defaultMessage: 'Sources: OTLP, Prometheus Remote Write, async _bulk',
                })}
              </h4>
              <ul>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsSourcesFlyout', {
                    defaultMessage: 'Source flyout: type/nature display.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsSourcesTable', {
                    defaultMessage: 'Sources table page.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsSourcesManagement', {
                    defaultMessage:
                      'Source management UI: add and configure OTLP, PRW, and async _bulk sources.',
                  })}
                </li>
              </ul>

              <h4>
                {i18n.translate('core.ui.chrome.milestone.flyoutShipsDestinationsHeading', {
                  defaultMessage: 'Destinations: S3 + local Elasticsearch',
                })}
              </h4>
              <ul>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsDestinationsTable', {
                    defaultMessage: 'Destinations table page.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsDestinationsPivot', {
                    defaultMessage: 'Pivot from a table row to a filtered canvas view.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutShipsDestinationsFlyout', {
                    defaultMessage: 'Destination flyout: type display, quality, and controls.',
                  })}
                </li>
              </ul>

              <h3>
                {i18n.translate('core.ui.chrome.milestone.flyoutExploreHeading', {
                  defaultMessage: 'What you can explore',
                })}
              </h3>
              <ul>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutExploreViews', {
                    defaultMessage: 'The core screens, navigation, and end-to-end flows.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutExploreInteractions', {
                    defaultMessage:
                      'The primary interactions and how the experience fits together.',
                  })}
                </li>
              </ul>

              <h3>
                {i18n.translate('core.ui.chrome.milestone.flyoutLimitationsHeading', {
                  defaultMessage: 'Known limitations',
                })}
              </h3>
              <ul>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutLimitationHardcoded', {
                    defaultMessage:
                      'The data shown is hardcoded and does not reflect a real cluster. Changes are not persisted.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutLimitationScope', {
                    defaultMessage:
                      'Scope and capabilities are limited — some actions and links are non-functional.',
                  })}
                </li>
              </ul>
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="chromeNextGlobalHeaderMilestoneFlyoutClose"
            >
              {i18n.translate('core.ui.chrome.milestone.flyoutCloseLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
});

MilestoneBadge.displayName = 'MilestoneBadge';
