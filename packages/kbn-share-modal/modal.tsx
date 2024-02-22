/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo, ReactElement } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiTab,
  EuiTabs,
  EuiForm,
  EuiCopy,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ModalProps {
  objectType: string;
  onClose: () => void;
  tabs: Array<{ id: string; name: string; content: ReactElement }>;
  modalBodyDescriptions: Array<{ id: string; description: any }>;
  copyData: string;
}

/**
 * <ShareModal objectType={} />
 */

export const ShareModal = ({ onClose, objectType, tabs, copyData }: ModalProps) => {
  const [selectedTabId, setSelectedTabId] = useState('link');

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

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

  const renderButtons = (id: string) => {
    if (id === 'link') {
      return (
        <EuiCopy textToCopy={copyData}>
          {(copy) => (
            <EuiButton fill data-test-subj="copyShareUrlButton" onClick={copy}>
              <FormattedMessage id="share.link.copyLinkButton" defaultMessage="Copy link" />
            </EuiButton>
          )}
        </EuiCopy>
      );
    } else if (id === 'embed') {
      return (
        <EuiButton fill data-test-subj="copyShareUrlButton">
          <FormattedMessage id="share.link.copyEmbedCodeButton" defaultMessage="Copy Embed code" />
        </EuiButton>
      );
    } else {
      return (
        <EuiButton fill data-test-subj="copyShareUrlButton">
          <FormattedMessage id="share.link.generateExportButton" defaultMessage="Generate export" />
        </EuiButton>
      );
    }
  };

  const renderTitle = () => (
    <FormattedMessage
      id="share.modalTitle"
      defaultMessage="Share this {objectType}"
      values={{ objectType }}
    />
  );

  return (
    // @ts-ignore
    <EuiModal css={{ width: '500px' }} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{renderTitle()}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiTabs>{renderTabs()}</EuiTabs>
        <EuiForm>{selectedTabContent}</EuiForm>
      </EuiModalBody>
      <EuiModalFooter>{renderButtons(selectedTabId)}</EuiModalFooter>
    </EuiModal>
  );
};
