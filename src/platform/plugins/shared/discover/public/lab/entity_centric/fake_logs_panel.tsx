/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiBadge,
  EuiLink,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiToolTip,
  type EuiSwitchEvent,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import {
  resolveEntityTypeIdForName,
  setChaosModeEnabled,
  useChaosModeEnabled,
  useEntityDisplayName,
  useEntityTypeEnabled,
} from '@kbn/entity-centric-lab-flyout';
import { useEntityCentricLab } from './entity_centric_lab_provider';
import {
  FAKE_LOG_ENTRIES,
  FAKE_LOG_ENTRIES_RECOVERY,
  type FakeLogEntry,
  type FakeLogLevel,
} from './constants';

const styles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css`
      margin-bottom: ${euiTheme.size.m};
    `,
  row: ({ euiTheme }: UseEuiTheme) =>
    css`
      display: grid;
      grid-template-columns: max-content max-content max-content 1fr;
      gap: ${euiTheme.size.s};
      align-items: baseline;
      padding: ${euiTheme.size.xs} 0;
      border-bottom: ${euiTheme.border.thin};
      font-family: ${euiTheme.font.familyCode};
      font-size: ${euiTheme.size.m};

      &:last-of-type {
        border-bottom: none;
      }
    `,
  timestamp: ({ euiTheme }: UseEuiTheme) =>
    css`
      color: ${euiTheme.colors.subduedText};
    `,
  message: ({ euiTheme }: UseEuiTheme) =>
    css`
      color: ${euiTheme.colors.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `,
  // The service name is rendered as plain subdued text when the
  // resolved entity type has its flyout trigger disabled. We keep the
  // help cursor + dotted underline so the user gets a visual hint that
  // there's *something* (a tooltip) rather than dead text.
  disabledServiceName: ({ euiTheme }: UseEuiTheme) =>
    css`
      color: ${euiTheme.colors.subduedText};
      cursor: help;
      text-decoration: underline dotted ${euiTheme.colors.subduedText};
      text-underline-offset: 2px;
    `,
};

const levelToColor = (level: FakeLogLevel) => {
  switch (level) {
    case 'ERROR':
      return 'danger';
    case 'WARN':
      return 'warning';
    case 'DEBUG':
      return 'hollow';
    case 'INFO':
    default:
      return 'default';
  }
};

const FakeLogRow = ({ entry }: { entry: FakeLogEntry }) => {
  const rowStyles = useMemoCss(styles);
  const { openEntity } = useEntityCentricLab();

  // Resolve the entity-type id that gates the flyout trigger for this
  // service name and subscribe to its enablement. When the type is
  // disabled in the "Manage entity types" table, we suppress the click
  // and render the service name as plain subdued text (still hinted by
  // a help cursor + dotted underline + tooltip so the user understands
  // why nothing happens).
  const entityTypeId = resolveEntityTypeIdForName(entry.serviceName);
  const triggerEnabled = useEntityTypeEnabled(entityTypeId);
  // Resolve the rendered label through the shared store so the wizard's
  // per-type `displayField` choice changes what shows up in Discover
  // without forcing a reload — e.g. picking `service.environment` for
  // the APM Service type swaps `payments-service` for `production`.
  // Navigation still uses the canonical name so the flyout can find
  // the entity in its own dataset.
  const displayServiceName = useEntityDisplayName(entry.serviceName);

  const onClickService = useCallback(() => {
    if (!triggerEnabled) return;
    openEntity(entry.serviceName);
  }, [openEntity, entry.serviceName, triggerEnabled]);

  return (
    <div css={rowStyles.row} data-test-subj={`entityCentricLabFakeLogRow-${entry.id}`}>
      <span css={rowStyles.timestamp}>{entry.timestamp}</span>
      <EuiBadge color={levelToColor(entry.level)}>{entry.level}</EuiBadge>
      {triggerEnabled ? (
        <EuiLink
          onClick={onClickService}
          // Stable test-subj key based on the canonical name so
          // existing selectors don't break when the wizard re-labels
          // the entity in the UI.
          data-test-subj={`entityCentricLabServiceLink-${entry.serviceName}`}
          aria-label={i18n.translate('discover.entityCentricLab.fakeLogs.serviceLinkAriaLabel', {
            defaultMessage: 'Open entity details for {serviceName}',
            values: { serviceName: displayServiceName },
          })}
        >
          {displayServiceName}
        </EuiLink>
      ) : (
        <EuiToolTip
          content={i18n.translate('discover.entityCentricLab.fakeLogs.serviceLinkDisabledTooltip', {
            defaultMessage:
              'The flyout trigger for this entity type is turned off in Manage entity types.',
          })}
        >
          <span
            css={rowStyles.disabledServiceName}
            data-test-subj={`entityCentricLabServiceLinkDisabled-${entry.serviceName}`}
            aria-label={i18n.translate(
              'discover.entityCentricLab.fakeLogs.serviceLinkDisabledAriaLabel',
              {
                defaultMessage: '{serviceName} (entity flyout disabled for this type)',
                values: { serviceName: displayServiceName },
              }
            )}
          >
            {displayServiceName}
          </span>
        </EuiToolTip>
      )}
      <span css={rowStyles.message}>{entry.message}</span>
    </div>
  );
};

/**
 * Smart wrapper used by call sites in Discover. Renders the panel only when
 * the `discover:entityCentricLab` setting is on, otherwise renders nothing.
 * Lets callers stay agnostic of the flag and avoids leaking the hook beyond
 * this module.
 */
export const EntityCentricLabPanel = () => {
  const { enabled } = useEntityCentricLab();
  if (!enabled) {
    return null;
  }
  return <FakeLogsPanel />;
};

/**
 * Compact toggle that flips the lab's global "chaos mode" boolean.
 * When OFF the PayFlow incident storyline is replaced by healthy
 * kind templates everywhere the storyline entities surface (this
 * panel's service links, the entity list, the grouped grid tiles
 * and the entity flyout). The dotted-underline tooltip explains
 * the demo wiring without cluttering the header.
 */
const ChaosModeToggle = () => {
  const chaosOn = useChaosModeEnabled();
  const onChange = useCallback((event: EuiSwitchEvent) => {
    setChaosModeEnabled(event.target.checked);
  }, []);
  return (
    <EuiToolTip
      content={i18n.translate('discover.entityCentricLab.fakeLogs.chaosToggleTooltip', {
        defaultMessage:
          'Replay the PayFlow incident across the entity list, grouped grid and flyouts. Turn off to roll back to the healthy state.',
      })}
    >
      <EuiSwitch
        compressed
        checked={chaosOn}
        onChange={onChange}
        label={i18n.translate('discover.entityCentricLab.fakeLogs.chaosToggleLabel', {
          defaultMessage: 'Chaos mode',
        })}
        data-test-subj="entityCentricLabChaosModeSwitch"
      />
    </EuiToolTip>
  );
};

export const FakeLogsPanel = () => {
  const containerStyles = useMemoCss(styles);
  // Subscribe to chaos mode so the log feed swaps the moment Sofia
  // flips the toggle (or clicks "Roll back to previous version" in a
  // service flyout). The flyout / entity list / grouped grid already
  // honour the same store; switching the log set here keeps Discover
  // in sync with the rest of the lab.
  const chaosOn = useChaosModeEnabled();
  const entries = chaosOn ? FAKE_LOG_ENTRIES : FAKE_LOG_ENTRIES_RECOVERY;

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      color="subdued"
      css={containerStyles.container}
      data-test-subj="entityCentricLabFakeLogsPanel"
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h3>
                  <FormattedMessage
                    id="discover.entityCentricLab.fakeLogs.title"
                    defaultMessage="Entity-centric logs"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('discover.entityCentricLab.fakeLogs.labBadgeLabel', {
                  defaultMessage: 'Lab',
                })}
                color="hollow"
                size="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="discover.entityCentricLab.fakeLogs.hint"
                  defaultMessage="Click a service name to inspect the entity"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ChaosModeToggle />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div role="list">
        {entries.map((entry) => (
          <FakeLogRow key={entry.id} entry={entry} />
        ))}
      </div>
    </EuiPanel>
  );
};
