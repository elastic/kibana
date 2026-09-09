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
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HasSerializedChildState, HasSerializableState } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';

export interface EmbeddableEditorPreviewProps<
  SerializedState extends object,
  Api extends DefaultEmbeddableApi<SerializedState> & HasSerializableState<SerializedState>,
  ParentApi extends HasSerializedChildState<SerializedState>
> {
  type: string;
  serializedState: SerializedState;
  getParentApi?: () => ParentApi;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  verticalAlignment?: 'stretch' | 'top';
}

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
  isOpen,
  onClose,
  title = defaultPreviewTitle,
  verticalAlignment = 'stretch',
}: EmbeddableEditorPreviewProps<SerializedState, Api, ParentApi>) => {
  const titleId = useGeneratedHtmlId({ prefix: 'embeddableEditorPreviewTitle' });
  const latestStateRef = useRef(serializedState);
  latestStateRef.current = serializedState;
  const [api, setApi] = useState<Api>();
  const [updateError, setUpdateError] = useState<Error>();
  const updateQueueRef = useRef(Promise.resolve());

  const parentApi = useMemo(() => {
    const baseParentApi: HasSerializedChildState<SerializedState> = {
      getSerializedStateForChild: () => latestStateRef.current,
    };
    return getParentApi ? getParentApi() : (baseParentApi as ParentApi);
  }, [getParentApi]);

  useEffect(() => {
    if (!api) return;
    updateQueueRef.current = updateQueueRef.current
      .then(async () => {
        setUpdateError(undefined);
        await api.applySerializedState(latestStateRef.current);
      })
      .catch((error: Error) => setUpdateError(error));
  }, [api, serializedState]);

  useEffect(() => {
    if (!isOpen) setApi(undefined);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="embeddableEditorPreviewFlyout"
      onClose={onClose}
      ownFocus={false}
      resizable
      session="inherit"
      size="m"
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
