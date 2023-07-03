/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Thread as Component, thread } from '@cord-sdk/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

export interface Props {
  threadId: string;
  onClickBack: () => void;
}

export const Thread = ({ threadId, onClickBack }: Props) => {
  const summary = thread.useThreadSummary(threadId);

  // @ts-expect-error The types are not up-to-date.
  const name = summary?.name;

  const threadCSS = css`
    --cord-thread-border: none;
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <span>
          <EuiButtonEmpty onClick={onClickBack} iconType="arrowLeft">
            All threads
          </EuiButtonEmpty>
        </span>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" style={{ padding: '4px 8px' }}>
          <h3>{name}</h3>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <Component {...{ threadId, css: threadCSS }} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
