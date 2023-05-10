/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiSelect,
  EuiSelectOption,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { JsonEditor, OnJsonEditorUpdateHandler } from '@kbn/es-ui-shared-plugin/public';
import { useServicesContext } from '../../../contexts';
import { sendRequest } from '../../../hooks/use_send_current_request/send_request';

interface Request {
  method: 'get' | 'post' | 'put';
  url: string;
  body: any;
}
export const Editor = () => {
  const [request, setRequest] = useState<Request>({
    method: 'get',
    url: '_search',
    body: {
      query: {
        match_all: {},
      },
    },
  });
  const updateBody: OnJsonEditorUpdateHandler = useCallback((state) => {
    if (state.isValid) {
      setRequest((prevRequest) => {
        return { ...prevRequest, body: state.data.format() };
      });
    }
  }, []);
  const methods: EuiSelectOption[] = [
    { value: 'get', text: 'GET' },
    { value: 'post', text: 'POST' },
    { value: 'put', text: 'PUT' },
  ];
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const requestActionsButtonId = useGeneratedHtmlId({
    prefix: 'console-editor-request-actions',
  });

  const {
    services: { http },
  } = useServicesContext();

  const sendRequestButtonHandler = async () => {
    const results = await sendRequest({
      http,
      requests: [
        { url: request.url, method: request.method, data: [JSON.stringify(request.body)] },
      ],
    });
    console.log({ results });
  };
  const requestActions = [
    <EuiContextMenuItem key="copy-as-curl" onClick={closePopover}>
      Copy as cURL
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="open-documentation" onClick={closePopover}>
      Open documentation
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="auto-ident" onClick={closePopover}>
      Auto indent
    </EuiContextMenuItem>,
  ];
  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFormRow label="Method">
            <EuiSelect
              id="console-editor-method-input"
              options={methods}
              value={request.method}
              onChange={(e) => {
                setRequest((prevRequest) => {
                  return { ...prevRequest, method: e.target.value as Request['method'] };
                });
              }}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="URL" fullWidth>
            <EuiFieldText
              fullWidth
              value={request.url}
              onChange={(e) => {
                setRequest((prevRequest) => {
                  return { ...prevRequest, url: e.target.value };
                });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace display="center">
            <EuiButton iconType="play" onClick={sendRequestButtonHandler}>
              Send
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace display="center">
            <EuiPopover
              id={requestActionsButtonId}
              button={
                <EuiButtonIcon
                  display="base"
                  size="m"
                  iconType="boxesVertical"
                  aria-label="More"
                  onClick={onButtonClick}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel size="s" items={requestActions} />
            </EuiPopover>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <JsonEditor
        label="Request body"
        onUpdate={updateBody}
        defaultValue={request.body}
        codeEditorProps={{
          height: '300px',
        }}
      />
    </div>
  );
};
