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

export const Default = () => {
  return <FlyoutFrame>test</FlyoutFrame>;
};

Default.story = {
  name: 'default',
};

export const WithTitle = () => {
  return <FlyoutFrame title="Hello world">test</FlyoutFrame>;
};

WithTitle.story = {
  name: 'with title',
};

export const WithOnClose = () => {
  return <FlyoutFrame onClose={() => console.log('onClose')}>test</FlyoutFrame>;
};

WithOnClose.story = {
  name: 'with onClose',
};

export const WithOnBack = () => {
  return (
    <FlyoutFrame onBack={() => console.log('onClose')} title={'Title'}>
      test
    </FlyoutFrame>
  );
};

WithOnBack.story = {
  name: 'with onBack',
};

export const CustomFooter = () => {
  return <FlyoutFrame footer={<button>click me!</button>}>test</FlyoutFrame>;
};

CustomFooter.story = {
  name: 'custom footer',
};

export const OpenInFlyout = () => {
  return (
    <EuiFlyout onClose={() => {}}>
      <FlyoutFrame
        title="Create drilldown"
        footer={<EuiButton>Save</EuiButton>}
        onClose={() => console.log('onClose')}
      >
        test
      </FlyoutFrame>
    </EuiFlyout>
  );
};

OpenInFlyout.story = {
  name: 'open in flyout',
};
