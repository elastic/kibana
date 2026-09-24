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
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HasSerializedChildState, HasSerializableState } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { FlyoutTemplate } from '@kbn/flyout-template';

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
  title = defaultPreviewTitle,
  verticalAlignment = 'stretch',
}: EmbeddableEditorPreviewProps<SerializedState, Api, ParentApi>) => {
  const latestStateRef = useRef(serializedState);
  latestStateRef.current = serializedState;
  const [api, setApi] = useState<Api>();
  const [updateError, setUpdateError] = useState<Error>();
  const updateQueueRef = useRef(Promise.resolve());

  const parentApi = useMemo(() => {
    const baseApi: HasSerializedChildState<SerializedState> & Record<string, unknown> = {
      ...(getParentApi?.() ?? {}),
      getSerializedStateForChild: () => latestStateRef.current,
    };
    return baseApi as ParentApi;
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

  return (
    <FlyoutTemplate
      data-test-subj="embeddableEditorPreviewFlyout"
      hideCloseButton
      onClose={() => {}}
      ownFocus={false}
      resizable
      session="inherit"
      size="m"
      flyoutMenuProps={{ title }}
    >
      <FlyoutTemplate.Header title={title} />
      <FlyoutTemplate.Body>
        <div
          css={css({
            display: 'flex',
            flexDirection: 'column',
            blockSize: '100%',
            minBlockSize: 240,
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
        </div>
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
};
