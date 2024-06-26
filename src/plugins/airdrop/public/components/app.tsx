/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { DragEvent, useState, useRef } from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import {
  EuiHorizontalRule,
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiCodeBlock,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { Form, FormState } from './form';

interface AirdropAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

const TRANSFER_DATA_TYPE = 'kibana';

export const AirdropApp = ({ basename, notifications, http }: AirdropAppDeps) => {
  const [formState, setFormState] = useState<FormState>({
    firstName: '',
    lastName: '',
    acceptTerms: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [timestamp, setTimestamp] = useState<string | undefined>();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const timeRef = useRef(0);

  // const onClickHandler = () => {
  //   // Use the core http service to make a response to the server API.
  //   http.get('/api/airdrop/example').then((res) => {
  //     setTimestamp(res.time);
  //     // Use the core notifications service to display a success message.
  //     notifications.toasts.addSuccess(
  //       i18n.translate('airdrop.dataUpdated', {
  //         defaultMessage: 'Data updated',
  //       })
  //     );
  //   });
  // };

  const onDragStart = (e: DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData(TRANSFER_DATA_TYPE, JSON.stringify(formState));
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(TRANSFER_DATA_TYPE)) {
      e.preventDefault();
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(TRANSFER_DATA_TYPE)) {
      e.preventDefault();
      if (isDragging || isDraggingOver) return;
      timeRef.current = Date.now();
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(TRANSFER_DATA_TYPE)) {
      e.preventDefault();
      const diff = Date.now() - timeRef.current; // Needed to prevent flickering
      if (isDragging) return;
      if (diff < 100) return;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(TRANSFER_DATA_TYPE)) {
      e.preventDefault();
      setIsDraggingOver(false);
      if (isDragging) return;
      const data = e.dataTransfer.getData(TRANSFER_DATA_TYPE);
      const jsonObject = JSON.parse(data);
      setFormState(jsonObject);
      console.log(jsonObject);
    }
  };

  return (
    <Router basename={basename}>
      <I18nProvider>
        <div
          id="dropzone"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: isDraggingOver ? '6px solid #4169e1' : '6px solid rgba(0,0,0,0)',
          }}
        >
          <div css={{ pointerEvents: isDraggingOver ? 'none' : 'auto' }}>
            <EuiPageTemplate
              restrictWidth="1000px"
              css={{ minBlockSize: 'max(460px,100vh - 108px) !important' }}
            >
              <EuiPageTemplate.Header>
                <EuiTitle size="l">
                  <h1>Airdrop</h1>
                </EuiTitle>
              </EuiPageTemplate.Header>
              <EuiPageTemplate.Section>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <EuiTitle>
                      <h2>My form</h2>
                    </EuiTitle>
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="airdrop.content"
                          defaultMessage="Some cool form to fill out"
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <div
                      id="draggable"
                      draggable
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      style={{
                        cursor: 'grab',
                      }}
                    >
                      <EuiButtonIcon
                        display="base"
                        iconSize="m"
                        size="m"
                        iconType="watchesApp"
                        aria-label="Next"
                      />
                    </div>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiHorizontalRule />

                <EuiSpacer />

                <Form
                  form={formState}
                  onChange={setFormState}
                  onSubmit={() => {
                    console.log('submit', formState);
                  }}
                />

                {/* <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                    {JSON.stringify(formState, null, 2)}
                  </EuiCodeBlock> */}

                <EuiSpacer />
              </EuiPageTemplate.Section>
            </EuiPageTemplate>
          </div>
        </div>
      </I18nProvider>
    </Router>
  );
};
