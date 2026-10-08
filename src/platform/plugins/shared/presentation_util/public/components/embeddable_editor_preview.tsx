/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  getFlyoutManagerStore,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HasSerializedChildState, HasSerializableState } from '@kbn/presentation-publishing';
import { useSearchApi } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';

export interface EmbeddableEditorPreviewProps<
  SerializedState extends object,
  Api extends DefaultEmbeddableApi<SerializedState> & HasSerializableState<SerializedState>,
  ParentApi extends HasSerializedChildState<SerializedState>
> {
  type: string;
  serializedState: SerializedState;
  /**
   * Overrides parts of the synthetic parent API, e.g. `timeRange$`, `query$` and `filters$`.
   * It is read once on mount, so the returned subjects must be stable.
   */
  getParentApi?: () => Partial<ParentApi>;
  /** Rendered above the embeddable, e.g. a time range picker. */
  toolbar?: ReactNode;
  title?: string;
  /**
   * A named size, as child flyouts require. EUI rejects `m` when the editor flyout is `m` too, so
   * pick a size that pairs with the editor's.
   */
  size?: 's' | 'm';
  verticalAlignment?: 'stretch' | 'top';
  /**
   * Called when the preview closes. The close button is only shown while EUI stacks the preview over
   * the editor flyout on narrow screens, where it is the only way back to the editor.
   */
  onClose?: () => void;
}

/** Whether EUI currently stacks child flyouts over their parent instead of beside it. */
const useIsFlyoutLayoutStacked = (): boolean => {
  const store = getFlyoutManagerStore();
  return useSyncExternalStore(store.subscribe, () => store.getState().layoutMode === 'stacked');
};

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
  toolbar,
  title = defaultPreviewTitle,
  size = 'm',
  verticalAlignment = 'stretch',
  onClose,
}: EmbeddableEditorPreviewProps<SerializedState, Api, ParentApi>) => {
  const titleId = useGeneratedHtmlId({ prefix: 'embeddableEditorPreviewTitle' });
  const latestStateRef = useRef(serializedState);
  latestStateRef.current = serializedState;
  const [api, setApi] = useState<Api>();
  const [updateError, setUpdateError] = useState<Error>();
  const updateQueueRef = useRef(Promise.resolve());
  const canClose = useIsFlyoutLayoutStacked() && onClose !== undefined;

  // Stable search subjects for the child embeddable. `useSearchApi` creates them once;
  // `EmbeddableRenderer` latches `getParentApi()` on mount so subjects must not be recreated.
  const searchApi = useSearchApi({});

  const parentApi = useMemo(() => {
    const baseApi: HasSerializedChildState<SerializedState> & Record<string, unknown> = {
      ...searchApi,
      ...(getParentApi?.() ?? {}),
      getSerializedStateForChild: () => latestStateRef.current,
    };
    return baseApi as ParentApi;
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

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="embeddableEditorPreviewFlyout"
      hideCloseButton={!canClose}
      // EUI removes a closed managed flyout whether or not this handler acts, and leaves stacked
      // mode before calling it, so always report the close.
      onClose={() => onClose?.()}
      ownFocus={false}
      resizable
      session="inherit"
      size={size}
      flyoutMenuProps={{ title }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css({
          '.euiFlyoutBody__overflowContent': { blockSize: '100%' },
        })}
      >
        {/* The embeddable takes the height left by the toolbar and callout, so the body doesn't scroll. */}
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false} css={{ height: '100%' }}>
          {toolbar ? <EuiFlexItem grow={false}>{toolbar}</EuiFlexItem> : null}
          {updateError ? (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                announceOnMount
                color="danger"
                title={i18n.translate(
                  'presentationUtil.embeddableEditorPreview.updateErrorMessage',
                  {
                    defaultMessage: 'Unable to update preview',
                  }
                )}
              >
                <p>{updateError.message}</p>
              </EuiCallOut>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem
            grow={verticalAlignment !== 'top'}
            css={verticalAlignment === 'top' ? undefined : { minHeight: 240 }}
          >
            <EmbeddableRenderer<SerializedState, Api, ParentApi>
              type={type}
              getParentApi={() => parentApi}
              hidePanelChrome
              onApiAvailable={setApi}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
