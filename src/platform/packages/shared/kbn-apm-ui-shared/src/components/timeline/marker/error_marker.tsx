/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import styled from '@emotion/styled';
import React, { useState } from 'react';
import { asDuration } from '../../../utils/formatters';
import type { ErrorMark } from '../../../types/mark';
import { Legend, Shape } from '../legend';

interface Props {
  mark: ErrorMark;
}

const Popover = styled.div`
  max-width: 280px;
`;

const Button = styled(Legend)`
  height: 20px;
  display: flex;
  align-items: flex-end;
`;

// We chose 240 characters because it fits most error messages and it's still easily readable on a screen.
function truncateMessage(errorMessage?: string) {
  const maxLength = 240;
  if (typeof errorMessage === 'string' && errorMessage.length > maxLength) {
    return errorMessage.substring(0, maxLength) + '…';
  } else {
    return errorMessage;
  }
}

export function ErrorMarker({ mark }: Props) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, showPopover] = useState(false);

  const togglePopover = () => showPopover(!isPopoverOpen);

  const button = (
    <Button
      data-test-subj="popover"
      clickable
      color={euiTheme.colors.danger}
      shape={Shape.square}
      onClick={togglePopover}
    />
  );

  const { error } = mark;

  const errorMessage = error.error.log?.message || error.error.exception?.message;
  const truncatedErrorMessage = truncateMessage(errorMessage);

  return (
    <EuiPopover
      id="popover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
      anchorPosition="upCenter"
    >
      <Popover>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <Legend
              text={asDuration(mark.offset)}
              indicator={<div style={{ marginRight: euiTheme.size.xs }}>@</div>}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <Legend
              key={mark.serviceColor}
              color={mark.serviceColor}
              text={error.service.name}
              indicator={<span />}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {mark.href ? (
              <EuiLink data-test-subj="apmErrorDetailsLink" href={mark.href}>
                {truncatedErrorMessage}
              </EuiLink>
            ) : mark.onClick ? (
              <EuiButtonEmpty
                data-test-subj="apmTimelineErrorMarkerButton"
                onClick={() => {
                  togglePopover();
                  mark.onClick?.();
                }}
              >
                {truncatedErrorMessage}
              </EuiButtonEmpty>
            ) : (
              truncatedErrorMessage
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </Popover>
    </EuiPopover>
  );
}
