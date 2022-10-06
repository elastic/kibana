/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef } from 'react';
import { EuiPopover, EuiText, EuiPopoverTitle } from '@elastic/eui';
import React from 'react';

interface GuideButtonPopoverProps {
  button: EuiPopover['button'];
  isGuidePanelOpen: boolean;
  title?: string;
  description?: string;
}
export const GuideButtonPopover = ({
  button,
  isGuidePanelOpen,
  title,
  description,
}: GuideButtonPopoverProps) => {
  const isPopoverShown = useRef(true);
  useEffect(() => {
    // the guide panel is closed by default and if the user opens it, we don't want to keep showing the popover
    if (isPopoverShown.current && isGuidePanelOpen) {
      isPopoverShown.current = false;
    }
  }, [isGuidePanelOpen]);
  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverShown.current && !isGuidePanelOpen}
      closePopover={() => {
        /* do nothing */
      }}
    >
      {title && <EuiPopoverTitle>{title}</EuiPopoverTitle>}
      <EuiText style={{ width: 300 }}>
        {description && <p>{description}</p>}
      </EuiText>
    </EuiPopover>
  );
};
