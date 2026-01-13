/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import * as React from 'react';
import { EuiFlyout, EuiButton } from '@elastic/eui';
import { FlyoutFrame } from '.';

export default {
  title: 'components/FlyoutFrame',
};

export const Default = {
  render: () => {
    return <FlyoutFrame>test</FlyoutFrame>;
  },

  name: 'default',
};

export const WithTitle = {
  render: () => {
    return <FlyoutFrame title="Hello world">test</FlyoutFrame>;
  },

  name: 'with title',
};

export const WithOnClose = {
  render: () => {
    return <FlyoutFrame onClose={() => console.log('onClose')}>test</FlyoutFrame>;
  },

  name: 'with onClose',
};

export const WithOnBack = {
  render: () => {
    return (
      <FlyoutFrame onBack={() => console.log('onClose')} title={'Title'}>
        test
      </FlyoutFrame>
    );
  },

  name: 'with onBack',
};

export const CustomFooter = {
  render: () => {
    return <FlyoutFrame footer={<button>click me!</button>}>test</FlyoutFrame>;
  },

  name: 'custom footer',
};

export const OpenInFlyout = {
  render: () => {
    return (
      <EuiFlyout onClose={() => {}} session="start">
        <FlyoutFrame
          title="Create drilldown"
          footer={<EuiButton>Save</EuiButton>}
          onClose={() => console.log('onClose')}
        >
          test
        </FlyoutFrame>
      </EuiFlyout>
    );
  },

  name: 'open in flyout',
};
