/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover, EuiPopoverProps, EuiPopoverTitle, EuiPopoverFooter } from '@elastic/eui';
import './field_popover.scss';

export interface FieldPopoverProps extends EuiPopoverProps {
  renderHeader?: () => React.ReactNode;
  renderContent?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
}

const FieldPopover: React.FC<FieldPopoverProps> = ({
  isOpen,
  closePopover,
  renderHeader,
  renderContent,
  renderFooter,
  ...otherPopoverProps
}) => {
  const header = (isOpen && renderHeader?.()) || null;
  const content = (isOpen && renderContent?.()) || null;
  const footer = (isOpen && renderFooter?.()) || null;

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
          {(content || footer) && header ? <EuiPopoverTitle>{header}</EuiPopoverTitle> : header}
          {content}
          {(content || header) && footer ? <EuiPopoverFooter>{footer}</EuiPopoverFooter> : footer}
        </>
      )}
    </EuiPopover>
  );
};

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldPopover;
