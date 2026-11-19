/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
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

const valueInputWrapperStyle = css`
  width: 120px;
`;

/** Keep the values on one line so a narrow flyout scrolls instead of covering it. */
const noWrapStyle = css`
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

const SAVED_INDICATOR_DURATION_MS = 1400;
const fadeInOut = keyframes`
  0% {
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

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
  // flag key -> save sequence number, so a repeat save restarts the indicator animation
  const [savedKeys, setSavedKeys] = useState<ReadonlyMap<string, number>>(new Map());

  /** Briefly marks a flag as saved so a changed value is visible even when nothing else moves. */
  const markSaved = useCallback((flagKey: string) => {
    setSavedKeys((current) => new Map(current).set(flagKey, (current.get(flagKey) ?? 0) + 1));
  }, []);

  const clearSaved = useCallback((flagKey: string) => {
    setSavedKeys((current) => {
      const next = new Map(current);
      next.delete(flagKey);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
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
      try {
        await http.put(buildPath(`${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`, { flagKey }), {
          body: JSON.stringify({ value }),
        });
        await refreshFlags();
        await load();
        markSaved(flagKey);
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
      }
    },
    [http, load, markSaved, refreshFlags]
  );

  const resetOverride = useCallback(
    async (flagKey: string) => {
      try {
        await http.delete(buildPath(`${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`, { flagKey }));
        await refreshFlags();
        await load();
        markSaved(flagKey);
      } catch {
        setErrorMessage(
          i18n.translate('core.featureFlags.helper.resetFailedErrorMessage', {
            defaultMessage: 'The override could not be removed.',
          })
        );
      }
    },
    [http, load, markSaved, refreshFlags]
  );

  const clearAll = useCallback(async () => {
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
    }
  }, [http, load, refreshFlags]);

  const columns: Array<EuiBasicTableColumn<FlagRow>> = [
    {
      field: 'key',
      name: i18n.translate('core.featureFlags.helper.flagColumnLabel', { defaultMessage: 'Flag' }),
      sortable: true,
      minWidth: '12rem',
      render: (key: string) => (
        <EuiText size="s" css={noWrapStyle}>
          {key}
        </EuiText>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('core.featureFlags.helper.typeColumnLabel', { defaultMessage: 'Type' }),
      width: '90px',
      minWidth: '90px',
      sortable: true,
    },
    {
      field: 'source',
      name: i18n.translate('core.featureFlags.helper.sourceColumnLabel', {
        defaultMessage: 'Source',
      }),
      width: '150px',
      minWidth: '150px',
      sortable: true,
      render: (source: FeatureFlagSource) => (
        <EuiBadge color={sourceColor[source]}>{sourceLabel(source)}</EuiBadge>
      ),
    },
  ];

  const valueColumnName = i18n.translate('core.featureFlags.helper.valueColumnLabel', {
    defaultMessage: 'Value',
  });

  if (forbidden) {
    columns.push({
      field: 'value',
      name: valueColumnName,
      width: '1px',
      render: (value: FeatureFlagValue) => (
        <EuiCode css={noWrapStyle}>{JSON.stringify(value)}</EuiCode>
      ),
    });
  } else {
    columns.push({
      name: valueColumnName,
      width: '1px',
      render: (row: FlagRow) => (
        <OverrideEditor
          row={row}
          savedSequence={savedKeys.get(row.key)}
          onSavedAnimationEnd={() => clearSaved(row.key)}
          onSave={(value) => saveOverride(row.key, value)}
        />
      ),
    });
    columns.push({
      name: i18n.translate('core.featureFlags.helper.actionsColumnLabel', {
        defaultMessage: 'Actions',
      }),
      width: '1px',
      align: 'center',
      render: (row: FlagRow) => {
        if (!row.hasRuntimeOverride) {
          return null;
        }
        const resetLabel = i18n.translate('core.featureFlags.helper.resetOverrideAriaLabel', {
          defaultMessage: 'Remove override for {flagKey}',
          values: { flagKey: row.key },
        });
        return (
          <EuiToolTip
            content={i18n.translate('core.featureFlags.helper.clearOverrideTooltip', {
              defaultMessage: 'Clear override',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="eraser"
              color="danger"
              aria-label={resetLabel}
              onClick={() => {
                void resetOverride(row.key);
              }}
              data-test-subj={`featureFlagsHelperReset-${row.key}`}
            />
          </EuiToolTip>
        );
      },
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
  draft: FeatureFlagValue
): draft is FeatureFlagValue {
  if (type === 'number') {
    return typeof draft === 'number' && Number.isFinite(draft);
  }
  return isFeatureFlagValue(draft);
}

function OverrideEditor({
  row,
  savedSequence,
  onSavedAnimationEnd,
  onSave,
}: {
  row: FlagRow;
  savedSequence: number | undefined;
  onSavedAnimationEnd: () => void;
  onSave: (value: FeatureFlagValue) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [draft, setDraft] = useState<FeatureFlagValue>(row.draft);
  useEffect(() => {
    setDraft(row.draft);
  }, [row.draft, row.key]);

  const commit = (value: FeatureFlagValue, isExplicit: boolean = false) => {
    const needsOverride = (row.type === 'boolean' || isExplicit) && !row.hasRuntimeOverride;
    if (!isSaveableOverride(row.type, value)) {
      // invalid, revert to previous value
      setDraft(row.draft);
      return;
    }
    if (Object.is(value, row.draft) && !needsOverride) {
      return;
    }
    onSave(value);
  };

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <FlagValueEditor row={row} draft={draft} onChange={setDraft} onCommit={commit} />
      <EuiFlexItem
        grow={false}
        css={css`
          flex-shrink: 0;
          width: ${euiTheme.size.base};
          margin-inline-start: ${euiTheme.size.xs};
        `}
      >
        {savedSequence !== undefined && (
          <EuiIcon
            key={savedSequence}
            type="check"
            color={euiTheme.colors.vis.euiColorVis2}
            css={css`
              animation: ${fadeInOut} ${SAVED_INDICATOR_DURATION_MS}ms ease-in-out forwards;
            `}
            onAnimationEnd={onSavedAnimationEnd}
            data-test-subj={`featureFlagsHelperSavedCheck-${row.key}`}
            aria-hidden={true}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function FlagValueEditor({
  row,
  draft,
  onChange,
  onCommit,
}: {
  row: FlagRow;
  draft: FeatureFlagValue;
  onChange: (value: FeatureFlagValue) => void;
  onCommit: (value: FeatureFlagValue, isExplicit?: boolean) => void;
}) {
  const commitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onCommit(draft, true);
    }
  };

  if (row.type === 'boolean') {
    return (
      <EuiButtonGroup
        legend={i18n.translate('core.featureFlags.helper.booleanOverrideLabel', {
          defaultMessage: 'Override {flagKey}',
          values: { flagKey: row.key },
        })}
        variant="selection"
        type="single"
        buttonSize="s"
        wrap={false}
        idSelected={draft === true ? `${row.key}-true` : `${row.key}-false`}
        onChange={(id) => {
          const next = id === `${row.key}-true`;
          onChange(next);
          onCommit(next);
        }}
        data-test-subj={`featureFlagsHelperValue-${row.key}`}
      >
        <EuiButton
          id={`${row.key}-true`}
          data-test-subj={`featureFlagsHelperValue-${row.key}-true`}
        >
          true
        </EuiButton>
        <EuiButton
          id={`${row.key}-false`}
          data-test-subj={`featureFlagsHelperValue-${row.key}-false`}
        >
          false
        </EuiButton>
      </EuiButtonGroup>
    );
  }

  if (row.type === 'number') {
    return (
      <EuiFlexItem grow={false} css={valueInputWrapperStyle}>
        <EuiFieldNumber
          compressed
          value={typeof draft === 'number' ? draft : ''}
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
          onBlur={() => onCommit(draft)}
          onKeyDown={commitOnEnter}
          data-test-subj={`featureFlagsHelperValue-${row.key}`}
        />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem grow={false} css={valueInputWrapperStyle}>
      <EuiFieldText
        compressed
        value={typeof draft === 'string' ? draft : String(draft)}
        maxLength={5000}
        aria-label={i18n.translate('core.featureFlags.helper.stringOverrideAriaLabel', {
          defaultMessage: 'Override value for {flagKey}',
          values: { flagKey: row.key },
        })}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={commitOnEnter}
        data-test-subj={`featureFlagsHelperValue-${row.key}`}
      />
    </EuiFlexItem>
  );
}
