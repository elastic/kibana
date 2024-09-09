/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import { EuiPopover, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
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
  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const [isPopoverShown, setIsPopoverShown] = useState(true);
  useEffect(() => {
    // close the popover after it was rendered once and the panel is opened
    if (isGuidePanelOpen && !isFirstRender.current) {
      setIsPopoverShown(false);
    }
  }, [isGuidePanelOpen]);
  return (
    <EuiPopover
      data-test-subj="manualCompletionPopover"
      button={button}
      isOpen={isPopoverShown}
      repositionOnScroll
      closePopover={() => {
        /* do nothing, the popover is closed once the panel is opened */
      }}
    >
      {title && (
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      )}
      <EuiSpacer />
      <EuiText size="s" style={{ width: 300 }}>
        {description && <p>{description}</p>}
      </EuiText>
    </EuiPopover>
  );
};
