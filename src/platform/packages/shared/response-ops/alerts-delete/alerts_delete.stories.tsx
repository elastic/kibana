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
import { AlertDeleteDescriptiveFormGroup } from './components/descriptive_form_group';
import { AlertDeleteModal } from './components/modal';

const http = {
  get: async (path: string, { query }: { query?: Record<string, string> }) => {
    if (path.includes('_alert_delete_preview')) {
      if (
        !query ||
        (Boolean(query?.is_active_alert_delete_enabled) === true &&
          parseInt(query?.active_alert_delete_threshold, 10) === 30)
      ) {
        return {
          affected_alert_count: 0,
        };
      }
      if (parseInt(query.active_alert_delete_threshold, 10) > 30) {
        return {
          affected_alert_count:
            Math.floor(parseInt(query.active_alert_delete_threshold, 10) / 30) - 1,
        };
      }
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

const DefaultStory = ({ isDisabled = false }: { isDisabled?: boolean }) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(true);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  return isFlyoutVisible ? (
    <EuiFlyout type="push" onClose={closeFlyout} maxWidth={440}>
      <EuiFlyoutBody>
        <AlertDeleteDescriptiveFormGroup
          services={{ http }}
          isDisabled={isDisabled}
          categoryIds={['management']}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : (
    <>
      <EuiButton onClick={showFlyout}>Click Me!</EuiButton>
      <p style={{ marginTop: '20px' }}>
        <strong>Warning:</strong> The preview API is mocked. It will return the number of months
        chosen in active alerts threshold - 1
      </p>
    </>
  );
};

export const RuleSettingsFlyout: StoryObj<typeof DefaultStory> = {
  args: {
    isDisabled: false,
  },
  argTypes: {
    isDisabled: {
      control: 'boolean',
      description: 'Controls the disabled state',
    },
  },
  render: DefaultStory,
};

const ModalOnlyStory = ({ isDisabled = false }: { isDisabled?: boolean }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const hideModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  return isModalVisible ? (
    <AlertDeleteModal
      services={{ http }}
      isVisible={isModalVisible}
      onCloseModal={hideModal}
      isDisabled={isDisabled}
      categoryIds={['observability']}
    />
  ) : (
    <>
      <EuiButton onClick={showModal}>Open Modal</EuiButton>
      <p style={{ marginTop: '20px' }}>
        <strong>Warning:</strong> The preview API is mocked. It will return the number of months
        chosen in active alerts threshold - 1
      </p>
    </>
  );
};

export const ModalOnly: StoryObj<typeof AlertDeleteModal> = {
  args: {
    isDisabled: false,
  },
  argTypes: {
    isDisabled: {
      control: 'boolean',
      description: 'Controls the disabled state',
    },
  },
  render: ModalOnlyStory,
};
