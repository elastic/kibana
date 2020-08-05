/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface VegaActionsMenuProps {
  formatHJson(): void;
  formatJson(): void;
}

function VegaActionsMenu({ formatHJson, formatJson }: VegaActionsMenuProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const onHJsonCLick = useCallback(() => {
    formatHJson();
    setIsPopoverOpen(false);
  }, [formatHJson]);

  const onJsonCLick = useCallback(() => {
    formatJson();
    setIsPopoverOpen(false);
  }, [formatJson]);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = (
    <EuiButtonIcon
      iconType="wrench"
      onClick={onButtonClick}
      aria-label={i18n.translate('visTypeVega.editor.vegaEditorOptionsButtonAriaLabel', {
        defaultMessage: 'Vega editor options',
      })}
    />
  );

  const items = [
    <EuiContextMenuItem key="hjson" onClick={onHJsonCLick}>
      <FormattedMessage
        id="visTypeVega.editor.reformatAsHJSONButtonLabel"
        defaultMessage="Reformat as HJSON"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="json" onClick={onJsonCLick}>
      <FormattedMessage
        id="visTypeVega.editor.reformatAsJSONButtonLabel"
        defaultMessage="Reformat as JSON, delete comments"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id="helpMenu"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
}

export { VegaActionsMenu };
