/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover, EuiPopoverProps, EuiPopoverTitle } from '@elastic/eui';
import './field_popover.scss';

export interface FieldPopoverProps extends EuiPopoverProps {
  renderHeader?: () => React.ReactNode;
  renderContent?: () => React.ReactNode;
}

export const FieldPopover: React.FC<FieldPopoverProps> = ({
  isOpen,
  closePopover,
  renderHeader,
  renderContent,
  ...otherPopoverProps
}) => {
  let header = null;
  let content = null;

  if (isOpen) {
    try {
      header = renderHeader?.() || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    try {
      content = renderContent?.() || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  return (
    <EuiPopover
      ownFocus
      isOpen={isOpen}
      closePopover={closePopover}
      display="block"
      anchorPosition="rightUp"
      data-test-subj="fieldPopover"
      panelClassName="unifiedFieldList__fieldPopover__fieldPopoverPanel"
      {...otherPopoverProps}
    >
      {isOpen && (
        <>
          {content && header ? <EuiPopoverTitle>{header}</EuiPopoverTitle> : header}
          {content}
        </>
      )}
    </EuiPopover>
  );
};
