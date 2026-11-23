/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  EuiIconTip,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
  type Query,
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

const rowSaveFailedMessage = i18n.translate('core.featureFlags.helper.rowSaveFailedMessage', {
  defaultMessage: 'Override failed to save.',
});

const rowResetFailedMessage = i18n.translate('core.featureFlags.helper.rowResetFailedMessage', {
  defaultMessage: 'Override failed to clear.',
});

function saveFailedMessage(flagKey: string): ReactNode {
  return (
    <FormattedMessage
      id="core.featureFlags.helper.saveFailedErrorMessage"
      defaultMessage="The override for {flagKey} failed to save."
      values={{ flagKey: <EuiCode>{flagKey}</EuiCode> }}
    />
  );
}

function resetFailedMessage(flagKey: string): ReactNode {
  return (
    <FormattedMessage
      id="core.featureFlags.helper.resetFailedErrorMessage"
      defaultMessage="The override for {flagKey} failed to clear."
      values={{ flagKey: <EuiCode>{flagKey}</EuiCode> }}
    />
  );
}

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

/** Lets the search box offer and validate `field:value` terms. Other terms match as plain text. */
const searchSchema = {
  strict: false,
  fields: {
    key: { type: 'string' },
    type: { type: 'string' },
    source: { type: 'string' },
    value: { type: 'string' },
  },
} as const;

/**
 * Saves for one flag, kept by the flyout so they outlive the row editor. A row can unmount and
 * come back (search, paging) while a save is still running, and clear actions need to see them.
 */
interface SaveQueue {
  /** The newest choice made while a save was in flight. Only the latest is kept. */
  queued: FeatureFlagValue | undefined;
  /** The newest choice, whether it is in flight or queued. Used to drop repeated commits. */
  requested: FeatureFlagValue | undefined;
  /** The last value the server accepted, or the stored value before any save. */
  confirmed: FeatureFlagValue;
  /** Whether the server has a runtime override for the flag. */
  overrideExists: boolean;
  /** Set when a clear action takes over, so the run stops without reloading or marking saved. */
  cancelled: boolean;
  /** Settles when the whole run, including any queued saves, has finished. */
  done: Promise<void>;
}

interface FlagSaves {
  submit: (
    flagKey: string,
    value: FeatureFlagValue,
    stored: { value: FeatureFlagValue; hasOverride: boolean }
  ) => void;
  /** The newest choice for a flag with a save in progress. */
  getPending: (flagKey: string) => FeatureFlagValue | undefined;
  /** The last value the server accepted for a flag with a save in progress. */
  getConfirmed: (flagKey: string) => FeatureFlagValue | undefined;
  hasSaveInProgress: (flagKey: string) => boolean;
  /** Lets a save show or revert the choice in whichever editor is mounted for the flag. */
  registerDraft: (flagKey: string, setDraft: (value: FeatureFlagValue) => void) => () => void;
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
  const [errorMessage, setErrorMessage] = useState<ReactNode>();
  const [query, setQuery] = useState<Query>(EuiSearchBar.Query.MATCH_ALL);
  // flag key -> save sequence number, so a repeat save restarts the indicator animation
  // Flags with a save in progress. They show as runtime overrides before the server confirms.
  const [savingKeys, setSavingKeys] = useState<ReadonlySet<string>>(new Set());
  const setSaving = useCallback((flagKey: string, saving: boolean) => {
    setSavingKeys((current) => {
      if (current.has(flagKey) === saving) {
        return current;
      }
      const next = new Set(current);
      if (saving) {
        next.add(flagKey);
      } else {
        next.delete(flagKey);
      }
      return next;
    });
  }, []);
  const [savedKeys, setSavedKeys] = useState<ReadonlyMap<string, number>>(new Map());

  // Failed changes by flag key. Shown on the row until the flag changes again, or on clear/refresh.
  const [rowErrors, setRowErrors] = useState<ReadonlyMap<string, ReactNode>>(new Map());
  const setRowError = useCallback((flagKey: string, message: ReactNode | undefined) => {
    setRowErrors((current) => {
      if (message === undefined && !current.has(flagKey)) {
        return current;
      }
      const next = new Map(current);
      if (message === undefined) {
        next.delete(flagKey);
      } else {
        next.set(flagKey, message);
      }
      return next;
    });
  }, []);
  const clearRowErrors = useCallback(() => setRowErrors(new Map()), []);
  /**
   * Shows a failed change in the banner at the top, and on its row, where the flag is already
   * clear from context so the row message can leave the name out.
   */
  const reportRowError = useCallback(
    (flagKey: string, bannerMessage: ReactNode, rowMessage: ReactNode = bannerMessage) => {
      setRowError(flagKey, rowMessage);
      setErrorMessage(bannerMessage);
    },
    [setRowError]
  );

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

  const latestLoad = useRef(0);

  const load = useCallback(
    async (keepError: boolean = false) => {
      latestLoad.current += 1;
      const currentLoad = latestLoad.current;
      if (!keepError) {
        setErrorMessage(undefined);
      }
      const [snapshotResult, overridesResult] = await Promise.allSettled([
        http.post<OfrepBulkResponse>(OFREP_BULK_PATH, { body: JSON.stringify({}) }),
        http.get<OverridesResponse>(FEATURE_FLAGS_OVERRIDES_API_PATH),
      ]);

      // A newer load started while this one was in flight, so its result is stale.
      if (currentLoad !== latestLoad.current) {
        return;
      }

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
    },
    [getBrowserEvaluations, http]
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Stores one override. Resolves to whether the server accepted it. */
  const persistOverride = useCallback(
    async (flagKey: string, value: FeatureFlagValue): Promise<boolean> => {
      setErrorMessage(undefined);
      setRowError(flagKey, undefined);
      try {
        await http.put(buildPath(`${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`, { flagKey }), {
          body: JSON.stringify({ value }),
        });
        return true;
      } catch (error) {
        reportRowError(
          flagKey,
          isForbidden(error)
            ? i18n.translate('core.featureFlags.helper.superuserSaveErrorMessage', {
                defaultMessage: 'Only a superuser can change runtime overrides.',
              })
            : saveFailedMessage(flagKey),
          isForbidden(error) ? undefined : rowSaveFailedMessage
        );
        return false;
      }
    },
    [http, reportRowError, setRowError]
  );

  /** Refreshes the flags and the table once a flag's saves have settled. */
  const settleOverride = useCallback(
    async (flagKey: string) => {
      try {
        await refreshFlags();
        // Keep the message from a failed save that happened earlier in the same run.
        await load(true);
      } catch {
        reportRowError(flagKey, saveFailedMessage(flagKey), rowSaveFailedMessage);
      }
    },
    [load, refreshFlags, reportRowError]
  );

  const saveQueues = useRef(new Map<string, SaveQueue>());
  const draftSetters = useRef(new Map<string, (value: FeatureFlagValue) => void>());

  /** Runs one flag's saves one at a time, then reloads the table once. */
  const runSaves = useCallback(
    async (flagKey: string, queue: SaveQueue, first: FeatureFlagValue) => {
      setSaving(flagKey, true);
      let next: FeatureFlagValue | undefined = first;
      let savedAny = false;
      let lastSaved = false;
      // A queued choice that matches what the server already accepted would be a duplicate request.
      const takeQueued = () => {
        const { queued, overrideExists, confirmed } = queue;
        return overrideExists && Object.is(queued, confirmed) ? undefined : queued;
      };
      while (next !== undefined) {
        while (next !== undefined) {
          const value: FeatureFlagValue = next;
          queue.queued = undefined;
          lastSaved = await persistOverride(flagKey, value);
          if (lastSaved) {
            queue.confirmed = value;
            queue.overrideExists = true;
            savedAny = true;
          }
          next = takeQueued();
          if (!lastSaved && next === undefined) {
            // Nothing newer is waiting, so show the last value the server accepted.
            draftSetters.current.get(flagKey)?.(queue.confirmed);
          }
        }
        if (savedAny && !queue.cancelled) {
          savedAny = false;
          await settleOverride(flagKey);
        }
        next = takeQueued();
      }
      saveQueues.current.delete(flagKey);
      setSaving(flagKey, false);
      // Only once nothing newer is waiting does the latest choice count as saved.
      if (lastSaved && !queue.cancelled) {
        markSaved(flagKey);
      }
    },
    [markSaved, persistOverride, setSaving, settleOverride]
  );

  const submitSave = useCallback<FlagSaves['submit']>(
    (flagKey, value, stored) => {
      const existing = saveQueues.current.get(flagKey);
      if (existing) {
        // Enter followed by blur, or a repeated click, asks for the same value again.
        if (!Object.is(existing.requested, value)) {
          existing.requested = value;
          existing.queued = value;
        }
        return;
      }
      const queue: SaveQueue = {
        queued: undefined,
        requested: value,
        confirmed: stored.value,
        overrideExists: stored.hasOverride,
        cancelled: false,
        done: Promise.resolve(),
      };
      saveQueues.current.set(flagKey, queue);
      queue.done = runSaves(flagKey, queue, value);
    },
    [runSaves]
  );

  /** Drops queued choices and waits for the save in flight, so a clear is not undone after it. */
  const cancelSaves = useCallback(async (flagKeys?: string[]) => {
    const queues = [...saveQueues.current.entries()]
      .filter(([flagKey]) => flagKeys === undefined || flagKeys.includes(flagKey))
      .map(([, queue]) => queue);
    queues.forEach((queue) => {
      queue.queued = undefined;
      queue.requested = undefined;
      queue.cancelled = true;
    });
    await Promise.all(queues.map((queue) => queue.done));
  }, []);

  const flagSaves = useMemo<FlagSaves>(
    () => ({
      submit: submitSave,
      getPending: (flagKey) => saveQueues.current.get(flagKey)?.requested,
      getConfirmed: (flagKey) => saveQueues.current.get(flagKey)?.confirmed,
      hasSaveInProgress: (flagKey) => saveQueues.current.has(flagKey),
      registerDraft: (flagKey, setDraft) => {
        draftSetters.current.set(flagKey, setDraft);
        return () => {
          if (draftSetters.current.get(flagKey) === setDraft) {
            draftSetters.current.delete(flagKey);
          }
        };
      },
    }),
    [submitSave]
  );

  const resetOverride = useCallback(
    async (flagKey: string) => {
      setErrorMessage(undefined);
      setRowError(flagKey, undefined);
      await cancelSaves([flagKey]);
      try {
        await http.delete(buildPath(`${FEATURE_FLAGS_OVERRIDES_API_PATH}/{flagKey}`, { flagKey }));
        await refreshFlags();
        await load();
        markSaved(flagKey);
      } catch {
        reportRowError(flagKey, resetFailedMessage(flagKey), rowResetFailedMessage);
      }
    },
    [cancelSaves, http, load, markSaved, refreshFlags, reportRowError, setRowError]
  );

  const clearAll = useCallback(async () => {
    clearRowErrors();
    await cancelSaves();
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
  }, [cancelSaves, clearRowErrors, http, load, refreshFlags]);

  const searchPlaceholder = i18n.translate('core.featureFlags.helper.searchPlaceholder', {
    defaultMessage: 'Search flags',
  });

  const visibleRows = useMemo(
    () =>
      EuiSearchBar.Query.execute(query, rows, {
        defaultFields: ['key', 'type', 'source', 'value'],
      }),
    [query, rows]
  );

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
      render: (source: FeatureFlagSource, row: FlagRow) => {
        const shownSource = savingKeys.has(row.key) ? 'runtime' : source;
        return <EuiBadge color={sourceColor[shownSource]}>{sourceLabel(shownSource)}</EuiBadge>;
      },
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
          error={rowErrors.get(row.key)}
          onSavedAnimationEnd={() => clearSaved(row.key)}
          isSaving={savingKeys.has(row.key)}
          saves={flagSaves}
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
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id={FEATURE_FLAGS_HELPER_TITLE_ID}>
            <FormattedMessage
              id="core.featureFlags.helper.flyoutTitle"
              defaultMessage="Feature flags"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {/* Outside the scrolling body, so it stays put while the table rows scroll. */}
      <EuiFlyoutHeader hasBorder data-test-subj="featureFlagsHelperPinned">
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
        {forbidden && (
          <>
            <EuiSpacer size="m" />
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
          </>
        )}
        {errorMessage && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout announceOnMount={false} size="s" title={errorMessage} />
          </>
        )}
        {!loading && !overridesUnavailable && (
          <>
            <EuiSpacer size="m" />
            <EuiSearchBar
              query={query}
              box={{
                incremental: true,
                placeholder: searchPlaceholder,
                schema: searchSchema,
                'data-test-subj': 'featureFlagsHelperSearch',
              }}
              onChange={({ query: nextQuery }) => {
                // Keep the last valid query while the typed one is incomplete.
                if (nextQuery) {
                  setQuery(nextQuery);
                }
              }}
            />
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading ? (
          <EuiLoadingSpinner size="l" />
        ) : overridesUnavailable ? null : (
          <EuiInMemoryTable<FlagRow>
            items={visibleRows}
            columns={columns}
            itemId="key"
            tableLayout="auto"
            scrollableInline
            stickyScrollbar
            stickyHeader
            sorting={{ sort: { field: 'key', direction: 'asc' } }}
            pagination={{ pageSizeOptions: [25, 50, 100], initialPageSize: 50 }}
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
                    clearRowErrors();
                    void refreshFlags().then(() => load());
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
  error,
  onSavedAnimationEnd,
  isSaving,
  saves,
}: {
  row: FlagRow;
  savedSequence: number | undefined;
  /** Why the last change to this flag failed. Shown in place of the saved check. */
  error: ReactNode | undefined;
  onSavedAnimationEnd: () => void;
  /** Whether a save for this flag is in progress. */
  isSaving: boolean;
  saves: FlagSaves;
}) {
  const { euiTheme } = useEuiTheme();
  // A row that comes back while a save is running starts from the choice being saved.
  const [draft, setDraft] = useState<FeatureFlagValue>(
    () => saves.getPending(row.key) ?? row.draft
  );
  useEffect(() => saves.registerDraft(row.key, setDraft), [row.key, saves]);
  useEffect(() => {
    // A reload from an earlier save must not replace a newer choice that is still being saved.
    if (!isSaving) {
      setDraft(row.draft);
    }
  }, [row.draft, row.key, isSaving]);

  const commit = (value: FeatureFlagValue | '', isExplicit: boolean = false) => {
    if (!isSaveableOverride(row.type, value)) {
      // invalid, revert to previous value
      setDraft(saves.getConfirmed(row.key) ?? row.draft);
      return;
    }
    if (!saves.hasSaveInProgress(row.key)) {
      const needsOverride = (row.type === 'boolean' || isExplicit) && !row.hasRuntimeOverride;
      if (Object.is(value, row.draft) && !needsOverride) {
        return;
      }
    }
    saves.submit(row.key, value, { value: row.draft, hasOverride: row.hasRuntimeOverride });
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
        {error !== undefined && (
          <EuiIconTip
            type="warning"
            color="danger"
            content={error}
            aria-label={i18n.translate('core.featureFlags.helper.changeFailedAriaLabel', {
              defaultMessage: 'Change failed',
            })}
            iconProps={{ 'data-test-subj': `featureFlagsHelperError-${row.key}` }}
          />
        )}
        {error === undefined && savedSequence !== undefined && (
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
