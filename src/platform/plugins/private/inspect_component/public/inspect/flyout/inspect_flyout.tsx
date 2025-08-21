/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import type { OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { LinksSection } from './links_section';
import { ComponentDataSection } from './component_data_section';
import { Header } from './header';
import type { ComponentData } from '../../types';

interface Props {
  componentData: ComponentData;
}

export const flyoutOptions: OverlayFlyoutOpenOptions = {
  size: 's',
  'data-test-subj': 'inspectComponentFlyout',
};

export const InspectFlyout = ({ componentData }: Props) => {
  return (
    <EuiFlyout
      aria-labelledby="inspectComponentFlyoutHeader"
      data-test-subj="inspectComponentFlyout"
      onClose={() => null}
      ownFocus
      size="s"
    >
      <Header />
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <ComponentDataSection componentData={componentData} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LinksSection componentData={componentData} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
