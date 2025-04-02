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
import { HttpStart } from '@kbn/core/public';
import { AlertDeleteRuleSettingsSection } from './components/rule_settings_section';
import { AlertDeleteModal } from './components/modal';

const http = {
  get: async (path: string) => {
    if (path.includes('_alert_delete_preview')) {
      return {
        affected_alert_count: Math.floor(Math.random() * 100),
      };
    }
    throw new Error('Not implemented');
  },
} as unknown as HttpStart;

const meta = {
  title: 'alertDelete',
};

export default meta;

const DefaultStory = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(true);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  return isFlyoutVisible ? (
    <EuiFlyout type="push" onClose={closeFlyout} maxWidth={440}>
      <EuiFlyoutBody>
        <AlertDeleteRuleSettingsSection http={http} />
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : (
    <EuiButton onClick={showFlyout}>Click Me!</EuiButton>
  );
};

export const RuleSettingsFlyout: StoryObj<typeof DefaultStory> = {
  render: DefaultStory,
};

const ModalOnlyStory = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const hideModal = () => setIsModalVisible(false);
  const showFlyout = () => setIsModalVisible(true);

  return isModalVisible ? (
    <AlertDeleteModal http={http} isVisible={isModalVisible} onCloseModal={hideModal} />
  ) : (
    <EuiButton onClick={showFlyout}>Open Modal</EuiButton>
  );
};

export const ModalOnly: StoryObj<typeof AlertDeleteModal> = {
  args: {
    isVisible: false,
    onCloseModal: () => {},
  },
  render: ModalOnlyStory,
};
