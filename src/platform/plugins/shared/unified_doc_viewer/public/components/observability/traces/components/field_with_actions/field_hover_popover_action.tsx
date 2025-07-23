/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiPopover,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiToolTip,
  PopoverAnchorPosition,
  type EuiPopoverProps,
} from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { useUIFieldActions } from '../../../../../hooks/use_field_actions';

interface HoverPopoverActionProps {
  children: React.ReactChild;
  field: string;
  fieldMapping?: DataViewField;
  value: unknown;
  formattedValue?: string;
  title: string;
  anchorPosition?: PopoverAnchorPosition;
  display?: EuiPopoverProps['display'];
}

export const FieldHoverActionPopover = ({
  children,
  title,
  field,
  fieldMapping: mapping,
  value,
  formattedValue,
  anchorPosition = 'upCenter',
  display = 'inline-block',
}: HoverPopoverActionProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);
  const uiFieldActions = useUIFieldActions({ field, value, formattedValue, mapping });

  const clearTimeoutIfExists = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
    }
  };

  // The timeout hack is required because we are using a Popover which ideally should be used with a mouseclick,
  // but we are using it as a Tooltip. Which means we now need to manually handle the open and close
  // state using the mouse hover events. This cause the popover to close even before the user could
  // navigate actions inside it. Hence, to prevent this, we need this hack
  const onMouseEnter = () => {
    clearTimeoutIfExists();
    setIsPopoverOpen(true);
  };

  const onMouseLeave = () => {
    leaveTimer.current = setTimeout(() => {
      return setIsPopoverOpen(false);
    }, 100);
  };

  useEffect(function onUnmount() {
    return () => {
      clearTimeoutIfExists();
    };
  }, []);

  return (
    <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <EuiPopover
        button={children}
        isOpen={isPopoverOpen}
        anchorPosition={anchorPosition}
        closePopover={closePopoverPlaceholder}
        panelPaddingSize="s"
        panelStyle={{ minWidth: '24px' }}
        display={display}
      >
        <EuiPopoverTitle className="eui-textBreakWord" css={{ maxWidth: '200px' }}>
          {title}
        </EuiPopoverTitle>
        <EuiFlexGroup wrap gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          {uiFieldActions.map((action) => (
            <EuiToolTip content={action.label} key={action.id} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="unifiedDocViewerObservabilityTracesFieldHoverActionPopoverButton"
                size="xs"
                iconType={action.iconType}
                aria-label={action.label}
                onClick={action.onClick}
              />
            </EuiToolTip>
          ))}
        </EuiFlexGroup>
      </EuiPopover>
    </span>
  );
};

const closePopoverPlaceholder = () => {};
