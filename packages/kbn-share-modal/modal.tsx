/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo, ReactElement } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiTab,
  EuiTabs,
  EuiForm,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ModalProps {
  objectType: string;
  onClose: () => void;
  tabs: Array<{ id: string; name: string; content: ReactElement }>;
}

export const ShareModal = ({ onClose, objectType, tabs }: ModalProps) => {
  const [selectedTabId, setSelectedTabId] = useState('link');

  useMemo(() => {
    return tabs.find(({ id }) => id === selectedTabId);
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  const renderTitle = () => (
    <FormattedMessage
      id="share.modalTitle"
      defaultMessage="Share this {objectType}"
      values={{ objectType }}
    />
  );

  return (
    // @ts-ignore css prop in EuiModal
    <EuiModal css={{ width: '500px' }} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{renderTitle()}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiTabs>{renderTabs()}</EuiTabs>
        <EuiForm>{tabs.find(({ id }) => id === selectedTabId)?.content}</EuiForm>
      </EuiModalBody>
    </EuiModal>
  );
};
