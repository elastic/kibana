/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { css } from '@emotion/react';
import classnames from 'classnames';
import { EuiDataGridCellPopoverElementProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

const containerStyles = css`
  height: 100%;
`;

export const DiscoverGridCellPopover: React.FC<
  Pick<EuiDataGridCellPopoverElementProps, 'cellActions' | 'setCellPopoverProps'>
> = ({ cellActions, setCellPopoverProps, children }) => {
  useEffect(() => {
    setCellPopoverProps({
      panelClassName: classnames('dscDiscoverGrid__cellPopover', {
        'dscDiscoverGrid__cellPopover--withJson':
          children &&
          typeof children === 'object' &&
          'props' in children &&
          children.props?.schema === 'kibana-json',
      }),
    });
  }, [setCellPopoverProps, children]);

  return (
    <EuiFlexGroup responsive={false} direction="column" gutterSize="none" css={containerStyles}>
      <EuiFlexItem grow={true}>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>{cellActions}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
