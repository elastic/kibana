/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Composer } from '@cord-sdk/react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';

import { ThreadList } from './thread_list';
import { Thread } from './thread';
import { IKbnUrlStateStorage, replaceUrlHashQuery } from './kibana_util';

export const STATE_STORAGE_KEY = '_t';

export interface Props {
  onClose: () => void;
  application: string;
  savedObjectId: string;
  savedObjectName?: string;
  kbnStateStorage: IKbnUrlStateStorage;
}

export interface URLStorageState {
  ic: boolean;
  tid?: string | null;
}

export const ThreadFlyout = ({
  onClose: onCloseProp,
  application,
  savedObjectId,
  savedObjectName,
  kbnStateStorage,
}: Props) => {
  const change = useObservable(kbnStateStorage.change$(STATE_STORAGE_KEY));
  const { tid: defaultThreadId } = kbnStateStorage.get(STATE_STORAGE_KEY) || {
    tid: null,
    ic: false,
  };

  const pageId = `${application}-${savedObjectId}`;
  const location = { page: pageId };
  const [threadId, setThreadId] = useState<string | null | undefined>(defaultThreadId);
  const [isComposingThread, setIsComposingThread] = useState(false);
  const defaultThreadName = `Comment on ${savedObjectName}`;
  const [threadName, _setThreadName] = useState(defaultThreadName);

  const setUriState = useCallback(
    ({ tid, ic = false }: { tid?: string | null; ic?: boolean } = {}) => {
      kbnStateStorage.set(STATE_STORAGE_KEY, { tid, ic }, { replace: true });
    },
    [kbnStateStorage]
  );

  useEffect(() => {
    if (change) {
      setIsComposingThread(change.ic);
      setThreadId(change.tid);
    }
  }, [change]);

  // const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setThreadName(e.target.value);
  // };

  const threadListCSS = css`
    visibility: ${threadId && !isComposingThread ? 'hidden' : 'visible'};
  `;

  const onClickBack = () => {
    setUriState({ tid: null });
  };

  const onThreadClick = (id: string) => {
    setUriState({ tid: id, ic: false });
  };

  const onClose = () => {
    const nextUrl = replaceUrlHashQuery(window.location.href, (hashQuery) => {
      delete hashQuery[STATE_STORAGE_KEY];
      return hashQuery;
    });
    kbnStateStorage.kbnUrlControls.update(nextUrl, true);
    onCloseProp();
  };

  return (
    <EuiFlyout onClose={onClose} size="s" paddingSize="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>Threads</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {threadId && !isComposingThread ? <Thread {...{ threadId, onClickBack }} /> : null}
        <ThreadList css={threadListCSS} {...{ application, savedObjectId, onThreadClick }} />
      </EuiFlyoutBody>
      {threadId && !isComposingThread ? null : (
        <EuiFlyoutFooter>
          {/*
          this isn't currently working.

          <EuiFormRow label="Thread title" display="rowCompressed">
            <EuiFieldText
              placeholder={defaultThreadName}
              value={threadName === defaultThreadName ? '' : threadName}
              onChange={(e) => onChange(e)}
              aria-label="Thread title"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          */}
          <Composer
            showExpanded={true}
            onFocus={({ threadId: tid }) => setUriState({ tid, ic: true })}
            onBlur={() => setUriState({ tid: null, ic: false })}
            {...{ location, threadName }}
          />
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
