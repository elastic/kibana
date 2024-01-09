/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ConsoleHeader = ({
  isConsoleOpen,
  rightSideItem,
  onClick,
}: {
  isConsoleOpen: boolean;
  rightSideItem?: React.ReactNode;
  onClick?: () => void;
}) => (
  <EuiFlexGroup justifyContent="spaceBetween" onClick={onClick}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={isConsoleOpen ? 'arrowUp' : 'arrowDown'} size="l" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('console.remoteConsole.title', {
            defaultMessage: 'Console',
          })}
        </h4>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem />
    {rightSideItem && <EuiFlexItem grow={false}>{rightSideItem}</EuiFlexItem>}
  </EuiFlexGroup>
);
