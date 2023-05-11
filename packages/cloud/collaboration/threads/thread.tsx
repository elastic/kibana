/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Thread as Component } from '@cord-sdk/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export interface Props {
  threadId: string;
  onClickBack: () => void;
}

export const Thread = ({ threadId, onClickBack }: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <span>
          <EuiButtonEmpty onClick={onClickBack} iconType="arrowLeft">
            All threads
          </EuiButtonEmpty>
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <Component {...{ threadId }} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
