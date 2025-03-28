/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { StoryObj } from '@storybook/react';
import { EuiButton } from '@elastic/eui';
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import { AlertDeleteRuleSettingsSection } from './components/rule_settings_section';

const CallToAction = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  return isFlyoutVisible ? (
    <EuiFlyout type="push" onClose={closeFlyout} maxWidth={440}>
      <EuiFlyoutBody>
        <AlertDeleteRuleSettingsSection />
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : (
    <EuiButton onClick={showFlyout}>Click Me!</EuiButton>
  );
};

const meta = {
  title: 'alertDelete',
  component: CallToAction,
};

export default meta;

type Story = StoryObj<typeof CallToAction>;

export const Default: Story = {
  args: {
    closeModal: () => {},
  },
};
