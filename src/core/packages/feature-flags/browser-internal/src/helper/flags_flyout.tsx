/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import { buildPath } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  buildFlagRows,
  isFeatureFlagValue,
  type FeatureFlagSource,
  type FeatureFlagValue,
  type FlagRow,
} from './flag_rows';

/** Same path the server registers. The browser package cannot import the server constant. */
export const FEATURE_FLAGS_OVERRIDES_API_PATH = '/internal/feature-flags/overrides';
export const OFREP_BULK_PATH = '/internal/feature-flags/ofrep/v1/evaluate/flags';
export const FEATURE_FLAGS_HELPER_TITLE_ID = 'featureFlagsHelperTitle';

interface OfrepBulkResponse {
  flags: Array<{ key: string; value: unknown }>;
}

interface TrackedFlagEvaluation {
  key: string;
  value: unknown;
}

interface OverridesResponse {
  runtimeOverrides: Record<string, unknown>;
  configOverrides: Record<string, unknown>;
  evaluatedFlags?: TrackedFlagEvaluation[];
}

export type FeatureFlagsHelperHttp = Pick<InternalHttpSetup, 'get' | 'post' | 'put' | 'delete'>;

export interface FlagsFlyoutProps {
  http: FeatureFlagsHelperHttp;
  refreshFlags: () => Promise<void>;
  /** Flags evaluated in this browser tab. Server evaluations arrive on the overrides response. */
  getBrowserEvaluations: () => TrackedFlagEvaluation[];
  onClose: () => void;
}

/** Keep the identifier on one line so a narrow flyout scrolls instead of covering it. */
const flagNameStyle = css`
  white-space: nowrap;
`;

const sourceColor: Record<FeatureFlagSource, 'accent' | 'primary' | 'success' | 'default'> = {
  runtime: 'accent',
  config: 'primary',
  provider: 'success',
  fallback: 'default',
};

function isForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 403
  );
}

function snapshotValues(body: OfrepBulkResponse | undefined): Record<string, unknown> {
  return evaluationValues(body?.flags);
}

function evaluationValues(flags: TrackedFlagEvaluation[] | undefined): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const flag of flags ?? []) {
    values[flag.key] = flag.value;
  }
  return values;
}

export function FlagsFlyout({
  http,
  refreshFlags,
  getBrowserEvaluations,
  onClose,
}: FlagsFlyoutProps) {
  const [rows, setRows] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [overridesUnavailable, setOverridesUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [busyKey, setBusyKey] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(undefined);
    const [snapshotResult, overridesResult] = await Promise.allSettled([
      http.post<OfrepBulkResponse>(OFREP_BULK_PATH, { body: JSON.stringify({}) }),
      http.get<OverridesResponse>(FEATURE_FLAGS_OVERRIDES_API_PATH),
    ]);

    const snapshot =
      snapshotResult.status === 'fulfilled' ? snapshotValues(snapshotResult.value) : {};
    const overridesForbidden =
      overridesResult.status === 'rejected' && isForbidden(overridesResult.reason);

    if (overridesResult.status === 'rejected' && !overridesForbidden) {
      setOverridesUnavailable(true);
      setForbidden(false);
      setRows([]);
      setErrorMessage(
        i18n.translate('core.featureFlags.helper.overridesLoadFailedErrorMessage', {
          defaultMessage: 'Runtime overrides could not be loaded. Refresh to try again.',
        })
      );
      setLoading(false);
      return;
    }

    const overrides: Partial<OverridesResponse> =
      overridesResult.status === 'fulfilled' ? overridesResult.value : {};
    setOverridesUnavailable(false);

    if (snapshotResult.status === 'rejected' && !overridesForbidden) {
      setErrorMessage(
        i18n.translate('core.featureFlags.helper.loadFailedErrorMessage', {
          defaultMessage: 'Feature flags could not be loaded.',
        })
      );
    }

    setForbidden(overridesForbidden);
    setRows(
      buildFlagRows({
        snapshot,
        runtimeOverrides: overrides.runtimeOverrides ?? {},
        configOverrides: overrides.configOverrides ?? {},
        // This tab's evaluation wins over another node's when the snapshot has no value.
        evaluated: {
          ...evaluationValues(overrides.evaluatedFlags),
          ...evaluationValues(getBrowserEvaluations()),
        },
      })
    );
    setLoading(false);
  }, [getBrowserEvaluations, http]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveOverride = useCallback(
    async (flagKey: string, value: FeatureFlagValue) => {
      setBusyKey(flagKey);
      try {
        await http.put(buildPath(`${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`, { flagKey }), {
          body: JSON.stringify({ value }),
        });
        await refreshFlags();
        await load();
      } catch (error) {
        setErrorMessage(
          isForbidden(error)
            ? i18n.translate('core.featureFlags.helper.superuserSaveErrorMessage', {
                defaultMessage: 'Only a superuser can change runtime overrides.',
              })
            : i18n.translate('core.featureFlags.helper.saveFailedErrorMessage', {
                defaultMessage: 'The override could not be saved.',
              })
        );
      } finally {
        setBusyKey(undefined);
      }
    },
    [http, load, refreshFlags]
  );

  const resetOverride = useCallback(
    async (flagKey: string) => {
      setBusyKey(flagKey);
      try {
        await http.delete(buildPath(`${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`, { flagKey }));
        await refreshFlags();
        await load();
      } catch {
        setErrorMessage(
          i18n.translate('core.featureFlags.helper.resetFailedErrorMessage', {
            defaultMessage: 'The override could not be removed.',
          })
        );
      } finally {
        setBusyKey(undefined);
      }
    },
    [http, load, refreshFlags]
  );

  const clearAll = useCallback(async () => {
    setBusyKey('*');
    try {
      await http.delete(FEATURE_FLAGS_OVERRIDES_API_PATH);
      await refreshFlags();
      await load();
    } catch {
      setErrorMessage(
        i18n.translate('core.featureFlags.helper.clearFailedErrorMessage', {
          defaultMessage: 'Runtime overrides could not be cleared.',
        })
      );
    } finally {
      setBusyKey(undefined);
    }
  }, [http, load, refreshFlags]);

  const columns: Array<EuiBasicTableColumn<FlagRow>> = [
    {
      field: 'key',
      name: i18n.translate('core.featureFlags.helper.flagColumnLabel', { defaultMessage: 'Flag' }),
      sortable: true,
      minWidth: '12rem',
      render: (key: string) => (
        <EuiText size="s" css={flagNameStyle}>
          {key}
        </EuiText>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('core.featureFlags.helper.typeColumnLabel', { defaultMessage: 'Type' }),
      width: '90px',
      sortable: true,
    },
    {
      field: 'source',
      name: i18n.translate('core.featureFlags.helper.sourceColumnLabel', {
        defaultMessage: 'Source',
      }),
      width: '150px',
      sortable: true,
      render: (source: FeatureFlagSource) => (
        <EuiBadge color={sourceColor[source]}>{sourceLabel(source)}</EuiBadge>
      ),
    },
    {
      field: 'value',
      name: i18n.translate('core.featureFlags.helper.valueColumnLabel', {
        defaultMessage: 'Evaluated value',
      }),
      width: '160px',
      render: (value: FeatureFlagValue) => <EuiText size="s">{String(value)}</EuiText>,
    },
  ];

  if (!forbidden) {
    columns.push({
      name: i18n.translate('core.featureFlags.helper.overrideColumnLabel', {
        defaultMessage: 'Override',
      }),
      width: '280px',
      render: (row: FlagRow) => (
        <OverrideEditor
          row={row}
          disabled={busyKey !== undefined}
          onSave={(value) => saveOverride(row.key, value)}
          onReset={() => resetOverride(row.key)}
        />
      ),
    });
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={FEATURE_FLAGS_HELPER_TITLE_ID}>
            <FormattedMessage
              id="core.featureFlags.helper.flyoutTitle"
              defaultMessage="Feature flags"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <KbnWarningCallout
          announceOnMount={false}
          size="s"
          title={i18n.translate('core.featureFlags.helper.deploymentWideTitle', {
            defaultMessage: 'Overrides apply to the whole deployment',
          })}
          text={i18n.translate('core.featureFlags.helper.deploymentWideDescription', {
            defaultMessage:
              'Saving an override changes the flag for every user. Other Kibana nodes pick it up within about 10 seconds.',
          })}
        />
        <EuiSpacer size="m" />
        {forbidden && (
          <>
            <KbnDangerCallout
              announceOnMount={false}
              size="s"
              data-test-subj="featureFlagsHelperForbidden"
              title={i18n.translate('core.featureFlags.helper.superuserRequiredTitle', {
                defaultMessage: 'Superuser required',
              })}
              text={i18n.translate('core.featureFlags.helper.superuserRequiredDescription', {
                defaultMessage:
                  'You can view flag values, but only a superuser can change runtime overrides.',
              })}
            />
            <EuiSpacer size="m" />
          </>
        )}
        {errorMessage && (
          <>
            <KbnDangerCallout announceOnMount={false} size="s" title={errorMessage} />
            <EuiSpacer size="m" />
          </>
        )}
        {loading ? (
          <EuiLoadingSpinner size="l" />
        ) : overridesUnavailable ? null : (
          <EuiInMemoryTable<FlagRow>
            items={rows}
            columns={columns}
            itemId="key"
            tableLayout="auto"
            scrollableInline
            stickyScrollbar
            sorting={{ sort: { field: 'key', direction: 'asc' } }}
            pagination={{ pageSizeOptions: [25, 50, 100], initialPageSize: 50 }}
            search={{
              box: {
                incremental: true,
                placeholder: i18n.translate('core.featureFlags.helper.searchPlaceholder', {
                  defaultMessage: 'Search flags',
                }),
                schema: true,
              },
            }}
            tableCaption={i18n.translate('core.featureFlags.helper.tableCaption', {
              defaultMessage: 'Feature flags and their evaluated values',
            })}
            data-test-subj="featureFlagsHelperTable"
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="featureFlagsHelperClose">
              <FormattedMessage
                id="core.featureFlags.helper.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {!forbidden && !overridesUnavailable && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="danger"
                    onClick={() => {
                      void clearAll();
                    }}
                    isLoading={busyKey === '*'}
                    isDisabled={busyKey !== undefined && busyKey !== '*'}
                    data-test-subj="featureFlagsHelperClearAll"
                  >
                    <FormattedMessage
                      id="core.featureFlags.helper.clearAllButtonLabel"
                      defaultMessage="Clear all runtime overrides"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => {
                    void refreshFlags().then(load);
                  }}
                  isDisabled={busyKey !== undefined}
                  data-test-subj="featureFlagsHelperRefresh"
                >
                  <FormattedMessage
                    id="core.featureFlags.helper.refreshButtonLabel"
                    defaultMessage="Refresh"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}

function sourceLabel(source: FeatureFlagSource): string {
  switch (source) {
    case 'runtime':
      return i18n.translate('core.featureFlags.helper.runtimeOverrideBadgeLabel', {
        defaultMessage: 'Runtime override',
      });
    case 'config':
      return i18n.translate('core.featureFlags.helper.configOverrideBadgeLabel', {
        defaultMessage: 'Config override',
      });
    case 'provider':
      return i18n.translate('core.featureFlags.helper.providerBadgeLabel', {
        defaultMessage: 'Provider',
      });
    case 'fallback':
      return i18n.translate('core.featureFlags.helper.fallbackBadgeLabel', {
        defaultMessage: 'Fallback',
      });
  }
}

function isSaveableOverride(
  type: FlagRow['type'],
  draft: FeatureFlagValue | ''
): draft is FeatureFlagValue {
  if (type === 'number') {
    return typeof draft === 'number' && Number.isFinite(draft);
  }
  return isFeatureFlagValue(draft);
}

function OverrideEditor({
  row,
  disabled,
  onSave,
  onReset,
}: {
  row: FlagRow;
  disabled: boolean;
  onSave: (value: FeatureFlagValue) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<FeatureFlagValue | ''>(row.draft);
  useEffect(() => {
    setDraft(row.draft);
  }, [row.draft, row.key]);

  const unchanged = Object.is(draft, row.draft);
  const saveLabel = i18n.translate('core.featureFlags.helper.saveOverrideAriaLabel', {
    defaultMessage: 'Save override for {flagKey}',
    values: { flagKey: row.key },
  });
  const resetLabel = i18n.translate('core.featureFlags.helper.resetOverrideAriaLabel', {
    defaultMessage: 'Remove override for {flagKey}',
    values: { flagKey: row.key },
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <FlagValueEditor row={row} draft={draft} disabled={disabled} onChange={setDraft} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={saveLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="check"
            aria-label={saveLabel}
            onClick={() => {
              if (isSaveableOverride(row.type, draft)) {
                onSave(draft);
              }
            }}
            isDisabled={disabled || unchanged || !isSaveableOverride(row.type, draft)}
            data-test-subj={`featureFlagsHelperSave-${row.key}`}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={resetLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="eraser"
            aria-label={resetLabel}
            onClick={onReset}
            isDisabled={disabled || !row.hasRuntimeOverride}
            data-test-subj={`featureFlagsHelperReset-${row.key}`}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function FlagValueEditor({
  row,
  draft,
  disabled,
  onChange,
}: {
  row: FlagRow;
  draft: FeatureFlagValue;
  disabled: boolean;
  onChange: (value: FeatureFlagValue | '') => void;
}) {
  if (row.type === 'boolean') {
    return (
      <EuiSwitch
        label={i18n.translate('core.featureFlags.helper.booleanOverrideLabel', {
          defaultMessage: 'Override {flagKey}',
          values: { flagKey: row.key },
        })}
        showLabel={false}
        checked={draft === true}
        disabled={disabled}
        compressed
        onChange={(event) => onChange(event.target.checked)}
        data-test-subj={`featureFlagsHelperValue-${row.key}`}
      />
    );
  }

  if (row.type === 'number') {
    return (
      <EuiFieldNumber
        compressed
        value={typeof draft === 'number' ? draft : ''}
        disabled={disabled}
        aria-label={i18n.translate('core.featureFlags.helper.numberOverrideAriaLabel', {
          defaultMessage: 'Override value for {flagKey}',
          values: { flagKey: row.key },
        })}
        onChange={(event) => {
          const next = event.target.value;
          if (next === '') {
            onChange('');
            return;
          }
          const parsed = Number(next);
          if (!Number.isNaN(parsed)) {
            onChange(parsed);
          }
        }}
        data-test-subj={`featureFlagsHelperValue-${row.key}`}
      />
    );
  }

  return (
    <EuiFieldText
      compressed
      value={typeof draft === 'string' ? draft : String(draft)}
      disabled={disabled}
      maxLength={5000}
      aria-label={i18n.translate('core.featureFlags.helper.stringOverrideAriaLabel', {
        defaultMessage: 'Override value for {flagKey}',
        values: { flagKey: row.key },
      })}
      onChange={(event) => onChange(event.target.value)}
      data-test-subj={`featureFlagsHelperValue-${row.key}`}
    />
  );
}
