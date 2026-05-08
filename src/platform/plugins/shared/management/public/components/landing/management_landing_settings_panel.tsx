/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import type { ApplicationStart } from '@kbn/core/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { LandingQuickActionOverlayRenderer } from '../../types';
import {
  MANAGEMENT_LANDING_SETTINGS_ROWS,
  type ManagementLandingSettingsRowDefinition,
} from './management_landing_settings_definitions';
import {
  ManagementLandingSettingsNavigateContent,
  ManagementLandingSettingsUiContent,
  ManagementLandingUiSettingReadonlyValue,
} from './management_landing_settings_inline_controls';

export function ManagementLandingSettingsPanel({
  capabilities,
  navigateToApp,
  uiSettings,
  getLandingQuickActionOverlay,
  onOpenLandingOverlay,
}: {
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
  uiSettings: IUiSettingsClient;
  getLandingQuickActionOverlay?: (id: string) => LandingQuickActionOverlayRenderer | undefined;
  onOpenLandingOverlay?: (overlayId: string) => void;
}) {
  const { euiTheme } = useEuiTheme();
  /** Prototype: dismiss applies until navigation/refresh only; no localStorage. */
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [dismissedRowIds, setDismissedRowIds] = useState<ReadonlySet<string>>(() => new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const visibleRows = useMemo(
    () =>
      MANAGEMENT_LANDING_SETTINGS_ROWS.filter((row) =>
        Boolean(get(capabilities, row.capabilityPath))
      ).filter((row) => !dismissedRowIds.has(row.id)),
    [capabilities, dismissedRowIds]
  );

  const handleDismissPanel = useCallback(() => {
    setPanelDismissed(true);
  }, []);

  const handleDismissRow = useCallback((rowId: string) => {
    setDismissedRowIds((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
    setEditingRowId((current) => (current === rowId ? null : current));
  }, []);

  const handleToggleEditRow = useCallback((rowId: string) => {
    setEditingRowId((current) => (current === rowId ? null : rowId));
  }, []);

  const rowTestSubj = useCallback((row: ManagementLandingSettingsRowDefinition): string => {
    return row.kind === 'navigate'
      ? `managementLandingSettingsNavigateRow-${row.id}`
      : `managementLandingSettingsUiRow-${row.id}`;
  }, []);

  if (panelDismissed || visibleRows.length === 0) {
    return null;
  }

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      data-test-subj="managementLandingSettingsPanel"
      css={css`
        display: flex;
        flex-direction: column;
        max-height: min(37.5rem, calc(100vh - 14rem));
        min-height: ${euiTheme.size.xl};
        overflow: hidden;
      `}
    >
      <EuiFlexGroup
        alignItems="flexStart"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
        css={css`
          flex-shrink: 0;
        `}
      >
        <EuiFlexItem grow={true}>
          <EuiTitle size="xs">
            <h2
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              <FormattedMessage
                id="management.landing.settingsPanel.title"
                defaultMessage="Personalize your environment"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            display="empty"
            iconType="cross"
            onClick={handleDismissPanel}
            aria-label={i18n.translate('management.landing.settingsPanel.dismissAriaLabel', {
              defaultMessage: 'Dismiss settings teaser',
            })}
            data-test-subj="managementLandingSettingsPanelDismiss"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <div
        data-test-subj="managementLandingSettingsPanelScrollArea"
        css={css`
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
          {visibleRows.map((row) => (
            <EuiFlexItem key={row.id} grow={false}>
              <div
                css={
                  row.sectionBreakBefore
                    ? css`
                        padding-top: ${euiTheme.size.m};
                        border-top: ${euiTheme.border.thin};
                      `
                    : undefined
                }
              >
                <EuiPanel
                  color="subdued"
                  paddingSize="s"
                  hasBorder
                  hasShadow={false}
                  data-test-subj={rowTestSubj(row)}
                >
                  <EuiFlexGroup
                    alignItems="flexStart"
                    justifyContent="spaceBetween"
                    responsive={false}
                    gutterSize="s"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={row.icon} size="m" aria-hidden />
                    </EuiFlexItem>
                    <EuiFlexItem
                      grow={true}
                      css={css`
                        min-width: 0;
                      `}
                    >
                      <EuiFlexGroup
                        direction="column"
                        gutterSize="none"
                        responsive={false}
                        alignItems="stretch"
                        css={css`
                          row-gap: 8px;
                        `}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="xxs">
                            <h3
                              css={css`
                                font-weight: ${euiTheme.font.weight.semiBold};
                                margin-bottom: 0;
                              `}
                            >
                              {row.title}
                            </h3>
                          </EuiTitle>
                        </EuiFlexItem>
                        {editingRowId !== row.id && row.kind === 'uiSetting' ? (
                          <EuiFlexItem
                            grow={false}
                            css={css`
                              min-width: 0;
                              padding-bottom: 8px;
                            `}
                          >
                            <ManagementLandingUiSettingReadonlyValue
                              row={row}
                              uiSettings={uiSettings}
                            />
                          </EuiFlexItem>
                        ) : null}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="xs" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            display="empty"
                            iconType="pencil"
                            aria-pressed={editingRowId === row.id}
                            onClick={() => handleToggleEditRow(row.id)}
                            aria-label={i18n.translate(
                              'management.landing.settingsPanel.rowEditAriaLabel',
                              {
                                defaultMessage: 'Edit {title}',
                                values: { title: row.title },
                              }
                            )}
                            data-test-subj={`managementLandingSettingsRowEdit-${row.id}`}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            display="empty"
                            iconType="cross"
                            onClick={() => handleDismissRow(row.id)}
                            aria-label={i18n.translate(
                              'management.landing.settingsPanel.rowDismissAriaLabel',
                              {
                                defaultMessage: 'Dismiss {title}',
                                values: { title: row.title },
                              }
                            )}
                            data-test-subj={`managementLandingSettingsRowDismiss-${row.id}`}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {editingRowId === row.id ? (
                    <>
                      <EuiSpacer size="s" />
                      {row.kind === 'navigate' ? (
                        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                          <EuiFlexItem grow={true}>
                            <ManagementLandingSettingsNavigateContent
                              row={row}
                              navigateToApp={navigateToApp}
                              getLandingQuickActionOverlay={getLandingQuickActionOverlay}
                              onOpenLandingOverlay={onOpenLandingOverlay}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              size="s"
                              onClick={() => setEditingRowId(null)}
                              data-test-subj={`managementLandingSettingsRowSave-${row.id}`}
                            >
                              <FormattedMessage
                                id="management.landing.settingsPanel.saveRow"
                                defaultMessage="Save"
                              />
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ) : (
                        <ManagementLandingSettingsUiContent
                          row={row}
                          uiSettings={uiSettings}
                          onDoneEditing={() => setEditingRowId(null)}
                        />
                      )}
                    </>
                  ) : null}
                </EuiPanel>
              </div>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );
}
