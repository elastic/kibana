/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RemoteConsoleProps } from '../../../types/remote_console';

export const RemoteConsole = ({ headerRightSideItem }: RemoteConsoleProps) => {
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const toggleConsole = () => setIsConsoleOpen(!isConsoleOpen);

  return (
    <EuiBottomBar position="sticky" onClick={toggleConsole}>
      <ConsoleHeader isConsoleOpen={isConsoleOpen} rightSideItem={headerRightSideItem} />
    </EuiBottomBar>
  );
};

const ConsoleHeader = ({
  isConsoleOpen,
  rightSideItem,
}: {
  isConsoleOpen: boolean;
  rightSideItem?: React.ReactNode;
}) => (
  <EuiFlexGroup justifyContent="spaceBetween">
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
    <EuiFlexItem grow={false}>
      <EuiIcon type="grab" size="l" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

// Default Export is needed to lazy load this react component
// eslint-disable-next-line import/no-default-export
export default RemoteConsole;
