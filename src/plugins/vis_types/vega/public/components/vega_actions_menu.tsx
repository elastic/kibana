/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
      id="actionsMenu"
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
