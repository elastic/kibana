/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useEuiTheme } from '@elastic/eui';

export function PopoverWrapper({
  children,
  position,
  popoverRef,
  dataTestSubj = 'ESQLEditor-popover',
  onMouseEnter,
  onMouseLeave,
}: {
  children: React.ReactNode;
  position: Record<string, number>;
  popoverRef: React.RefObject<HTMLDivElement>;
  dataTestSubj?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const theme = useEuiTheme();

  return (
    <>
      {createPortal(
        Object.keys(position).length !== 0 && position.constructor === Object && (
          <div
            style={{
              ...position,
              backgroundColor: theme.euiTheme.colors.emptyShade,
              borderRadius: theme.euiTheme.border.radius.small,
              position: 'absolute',
              overflowY: 'auto',
              maxHeight: '400px',
              outline: 'none',
              zIndex: 1001,
              border: theme.euiTheme.border.thin,
            }}
            ref={popoverRef}
            data-test-subj={dataTestSubj}
            tabIndex={-1} // Make the popover div focusable
            role="button" // Make it interactive for mouse events
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {children}
          </div>
        ),
        document.body
      )}
    </>
  );
}
