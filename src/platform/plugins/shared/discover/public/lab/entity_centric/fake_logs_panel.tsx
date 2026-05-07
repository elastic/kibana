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
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useEntityCentricLab } from './entity_centric_lab_provider';
import { FAKE_LOG_ENTRIES, type FakeLogEntry, type FakeLogLevel } from './constants';

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
  const onClickService = useCallback(() => {
    openEntity(entry.serviceName);
  }, [openEntity, entry.serviceName]);

  return (
    <div css={rowStyles.row} data-test-subj={`entityCentricLabFakeLogRow-${entry.id}`}>
      <span css={rowStyles.timestamp}>{entry.timestamp}</span>
      <EuiBadge color={levelToColor(entry.level)}>{entry.level}</EuiBadge>
      <EuiLink
        onClick={onClickService}
        data-test-subj={`entityCentricLabServiceLink-${entry.serviceName}`}
        aria-label={i18n.translate('discover.entityCentricLab.fakeLogs.serviceLinkAriaLabel', {
          defaultMessage: 'Open entity details for {serviceName}',
          values: { serviceName: entry.serviceName },
        })}
      >
        {entry.serviceName}
      </EuiLink>
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

export const FakeLogsPanel = () => {
  const containerStyles = useMemoCss(styles);

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
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="discover.entityCentricLab.fakeLogs.hint"
              defaultMessage="Click a service name to inspect the entity"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div role="list">
        {FAKE_LOG_ENTRIES.map((entry) => (
          <FakeLogRow key={entry.id} entry={entry} />
        ))}
      </div>
    </EuiPanel>
  );
};
