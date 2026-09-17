/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import type { HasSerializedChildState, HasSerializableState } from '@kbn/presentation-publishing';
import { useSearchApi } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { coreServices } from '../services/kibana_services';

export interface EmbeddableEditorPreviewProps<
  SerializedState extends object,
  Api extends DefaultEmbeddableApi<SerializedState> & HasSerializableState<SerializedState>,
  ParentApi extends HasSerializedChildState<SerializedState>
> {
  type: string;
  serializedState: SerializedState;
  getParentApi?: () => ParentApi;
  title?: string;
  verticalAlignment?: 'stretch' | 'top';
  /** When true, renders a preview-local time picker above the embeddable. */
  showTimePicker?: boolean;
  /**
   * Seeds the preview-local time range. The caller should pass
   * `savedItem.time_range ?? timefilter.getTime()`. Required when `showTimePicker` is set.
   */
  initialTimeRange?: TimeRange;
}

/** Derives a type-safe config object that callers can co-locate with each editor entry point. */
export type ManagedEditorPreviewConfig = Pick<
  EmbeddableEditorPreviewProps<never, never, never>,
  'type' | 'showTimePicker' | 'verticalAlignment'
>;

const defaultPreviewTitle = i18n.translate('presentationUtil.embeddableEditorPreview.flyoutTitle', {
  defaultMessage: 'Preview',
});

/** Renders a live embeddable preview as a child of a managed editor flyout. */
export const EmbeddableEditorPreview = <
  SerializedState extends object,
  Api extends DefaultEmbeddableApi<SerializedState> & HasSerializableState<SerializedState>,
  ParentApi extends HasSerializedChildState<SerializedState>
>({
  type,
  serializedState,
  getParentApi,
  title = defaultPreviewTitle,
  verticalAlignment = 'stretch',
  showTimePicker,
  initialTimeRange,
}: EmbeddableEditorPreviewProps<SerializedState, Api, ParentApi>) => {
  const titleId = useGeneratedHtmlId({ prefix: 'embeddableEditorPreviewTitle' });
  const latestStateRef = useRef(serializedState);
  latestStateRef.current = serializedState;
  const [api, setApi] = useState<Api>();
  const [updateError, setUpdateError] = useState<Error>();
  const updateQueueRef = useRef(Promise.resolve());

  // Preview-local time range — seeds from the caller-supplied initial value and never writes back.
  const [timeRange, setTimeRange] = useState<TimeRange | undefined>(initialTimeRange);
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<
    Array<{ start: string; end: string }>
  >([]);

  // Stable search subjects for the child embeddable. `useSearchApi` creates them once;
  // `EmbeddableRenderer` latches `getParentApi()` on mount so subjects must not be recreated.
  const searchApi = useSearchApi({ timeRange: showTimePicker ? timeRange : undefined });

  const parentApi = useMemo(() => {
    const baseApi: HasSerializedChildState<SerializedState> & Record<string, unknown> = {
      ...(getParentApi?.() ?? {}),
      ...searchApi,
      // When the time picker is shown, override the child's own time_range so that the picker
      // wins over any per-item saved time_range (fetch.ts resolves `local ?? parent`).
      getSerializedStateForChild: () =>
        showTimePicker && timeRange
          ? ({ ...latestStateRef.current, time_range: timeRange } as SerializedState)
          : latestStateRef.current,
    };
    return baseApi as ParentApi;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getParentApi, searchApi]);

  useEffect(() => {
    if (!api) return;
    updateQueueRef.current = updateQueueRef.current
      .then(async () => {
        setUpdateError(undefined);
        await api.applySerializedState(latestStateRef.current);
      })
      .catch((error: Error) => setUpdateError(error));
  }, [api, serializedState]);

  const quickRanges = useMemo(() => {
    return coreServices.uiSettings
      .get<Array<{ from: string; to: string; display: string }>>('timepicker:quickRanges', [])
      .map(({ from, to, display }) => ({ start: from, end: to, label: display }));
  }, []);
  const dateFormat = coreServices.uiSettings.get<string>(
    'dateFormat',
    'MMM D, YYYY @ HH:mm:ss.SSS'
  );

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="embeddableEditorPreviewFlyout"
      hideCloseButton
      onClose={() => {}}
      ownFocus={false}
      resizable
      session="inherit"
      size="m"
      flyoutMenuProps={{ title }}
    >
      <EuiFlyoutHeader hasBorder>
        {showTimePicker ? (
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2 id={titleId}>{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSuperDatePicker
                compressed
                start={timeRange?.from ?? 'now-15m'}
                end={timeRange?.to ?? 'now'}
                dateFormat={dateFormat}
                commonlyUsedRanges={quickRanges}
                recentlyUsedRanges={recentlyUsedRanges}
                updateButtonProps={{ iconOnly: true, fill: false }}
                onTimeChange={({ start, end, isInvalid }) => {
                  if (isInvalid) return;
                  const next = { from: start, to: end };
                  setTimeRange(next);
                  setRecentlyUsedRanges((prev) => [
                    { start, end },
                    ...prev.filter((r) => r.start !== start || r.end !== end).slice(0, 9),
                  ]);
                }}
                data-test-subj="embeddableEditorPreviewDatePicker"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiTitle size="s">
            <h2 id={titleId}>{title}</h2>
          </EuiTitle>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css({
          '.euiFlyoutBody__overflowContent': { blockSize: '100%' },
        })}
      >
        {updateError ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.translate('presentationUtil.embeddableEditorPreview.updateErrorMessage', {
              defaultMessage: 'Unable to update preview',
            })}
          >
            <p>{updateError.message}</p>
          </EuiCallOut>
        ) : null}
        <div
          css={css(
            verticalAlignment === 'top'
              ? { blockSize: 'fit-content' }
              : { blockSize: '100%', minBlockSize: 240 }
          )}
        >
          <EmbeddableRenderer<SerializedState, Api, ParentApi>
            type={type}
            getParentApi={() => parentApi}
            hidePanelChrome
            onApiAvailable={setApi}
          />
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
