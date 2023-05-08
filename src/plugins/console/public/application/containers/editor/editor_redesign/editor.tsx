/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
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
import { JsonEditor } from '@kbn/es-ui-shared-plugin/public';

export const Editor = () => {
  const methods: EuiSelectOption[] = [
    { value: 'get', text: 'GET' },
    { value: 'post', text: 'POST' },
  ];
  const [isPopoverOpen, setPopover] = useState(false);
  const requestActionsButtonId = useGeneratedHtmlId({
    prefix: 'console-editor-request-actions',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
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
              value="get"
              onChange={(e) => {}}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="URL" fullWidth>
            <EuiFieldText fullWidth />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace display="center">
            <EuiButton iconType="play">Send</EuiButton>
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
        onUpdate={() => {}}
        value={JSON.stringify({ test: 'test' })}
        codeEditorProps={{
          height: '300px',
        }}
      />
    </div>
  );
};
