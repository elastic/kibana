/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ViewDetailsPopover } from './view_details_popover';
import { getWarningsDescription } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

interface Props {
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsCalloutBody = (props: Props) => {
  if (!props.warnings.length) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
      <EuiFlexItem grow={false}>{getWarningsDescription(props.warnings)}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ViewDetailsPopover displayAsLink={true} warnings={props.warnings} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
