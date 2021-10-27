/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import React from 'react';

interface VegaMessagesListProps {
  messages: Array<{ type: 'err' | 'warning'; text: string }>;
  removeMessage: (text: string) => void;
}

export const VegaMessagesList = ({ messages, removeMessage }: VegaMessagesListProps) => {
  return messages.map(({ type, text }) => {
    const color = type === 'err' ? 'danger' : 'warning';

    return (
      <li className="vgaVis__message vgaVis__message--${type}">
        <EuiCallOut color={color} size="s">
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="alert" color={color} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color={color}>
                {text}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label="close"
                iconType="cross"
                color={color}
                onClick={() => removeMessage(text)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      </li>
    );
  });
};
