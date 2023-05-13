/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { Composer } from '@cord-sdk/react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { ThreadList } from './thread_list';
import { Thread } from './thread';

export interface Props {
  onClose: () => void;
  application: string;
  savedObjectId: string;
  savedObjectName?: string;
}

export const ThreadFlyout = ({ onClose, application, savedObjectId, savedObjectName }: Props) => {
  const pageId = `${application}-${savedObjectId}`;
  const location = { page: pageId };
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const defaultThreadName = `Comment on ${savedObjectName}`;
  const [threadName, _setThreadName] = useState(defaultThreadName);

  // const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setThreadName(e.target.value);
  // };

  const threadListCSS = css`
    visibility: ${threadId ? 'hidden' : 'visible'};
  `;

  return (
    <EuiFlyout onClose={onClose} size="s" paddingSize="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>Threads</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {threadId ? <Thread threadId={threadId} onClickBack={() => setThreadId(null)} /> : null}
        <ThreadList
          css={threadListCSS}
          onThreadClick={(id) => setThreadId(id)}
          {...{ application, savedObjectId }}
        />
      </EuiFlyoutBody>
      {threadId ? null : (
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
          <Composer showExpanded={true} {...{ location, threadName }} />
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
