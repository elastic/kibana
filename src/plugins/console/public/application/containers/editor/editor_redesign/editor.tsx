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
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiSelect,
  EuiSelectOption,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { JsonEditor, OnJsonEditorUpdateHandler } from '@kbn/es-ui-shared-plugin/public';
import { monaco as monacoEditor } from '@kbn/monaco';
import { useSendCurrentRequest } from '../../../hooks/use_send_current_request';
import { SenseEditor } from '../../../models';

interface Request {
  method: 'get' | 'post' | 'put';
  url: string;
  body: any;
}
export const Editor = () => {
  const editorInstance = {
    getRequestsInRange: () => {
      return [{ url: request.url, method: request.method, data: [JSON.stringify(request.body)] }];
    },
  };
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

  const sendCurrentRequst = useSendCurrentRequest(editorInstance as unknown as SenseEditor);

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
    <>
      <EuiForm style={{ width: '100%' }} component="form">
        <EuiSpacer />
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
              <EuiButton iconType="play" onClick={sendCurrentRequst}>
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
            editorDidMount: (editor) => {
              monacoEditor.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                schemas: [
                  {
                    uri: editor.getModel()?.uri.toString() ?? '',
                    fileMatch: ['*'],
                    schema: {
                      type: 'object',
                      properties: {
                        query: {
                          type: 'object',
                          properties: {
                            match_all: {
                              type: 'object',
                            },
                            term: {
                              type: 'object',
                              description:
                                'Returns documents that contain an exact term in a provided field',
                              patternProperties: {
                                '.*': {
                                  type: 'object',
                                  properties: {
                                    value: {
                                      type: 'string',
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              });
            },
          }}
        />
      </EuiForm>
    </>
  );
};
