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
import { EuiHorizontalRule, EuiPageTemplate, EuiTitle, EuiText, EuiCodeBlock } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

interface AirdropAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

export const AirdropApp = ({ basename, notifications, http }: AirdropAppDeps) => {
  // Use React hooks to manage state.
  const [isDragging, setIsDragging] = useState(false);
  const [timestamp, setTimestamp] = useState<string | undefined>();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const timeRef = useRef(0);

  const [formState, setFormState] = useState({
    name: 'John Doe',
    email: 'johndoe@foo.com',
  });

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
    e.dataTransfer.setData('application/json', JSON.stringify(formState));
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault(); // Necessary to allow a drop
    if (isDragging) return;
    if (isDraggingOver) return;
    timeRef.current = Date.now();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault(); // Necessary to allow a drop
    const diff = Date.now() - timeRef.current; // Needed to prevent flickering
    if (isDragging) return;
    if (diff < 100) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (isDragging) return;
    const data = e.dataTransfer.getData('application/json');
    const jsonObject = JSON.parse(data);
    console.log(jsonObject);
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
                <EuiTitle>
                  <h2>My form</h2>
                </EuiTitle>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="airdrop.content"
                      defaultMessage="Look through the generated code and check out the plugin development documentation."
                    />
                  </p>
                  <EuiHorizontalRule />
                  {/* <p>
                  <FormattedMessage
                    id="airdrop.timestampText"
                    defaultMessage="Last timestamp: {time}"
                    values={{ time: timestamp ? timestamp : 'Unknown' }}
                  />
                </p> */}
                  <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                    {JSON.stringify(formState, null, 2)}
                  </EuiCodeBlock>
                  {/* <EuiButton
                  color="primary"
                  size="s"
                  draggable
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                >
                  Drag data
                </EuiButton> */}
                  <div
                    id="draggable"
                    draggable
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    style={{
                      padding: '10px',
                      border: '1px solid black',
                      width: '100px',
                      textAlign: 'center',
                      cursor: 'grab',
                    }}
                  >
                    Drag me!
                  </div>
                </EuiText>

                {/* <div
                id="dropzone"
                draggable
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  width: '100%',
                  height: '300px',
                  marginTop: '20px',
                  border: '2px dashed #000',
                  textAlign: 'center',
                  paddingTop: '50px',
                }}
              >
                Drop here!
              </div> */}
              </EuiPageTemplate.Section>
            </EuiPageTemplate>
          </div>
        </div>
      </I18nProvider>
    </Router>
  );
};
