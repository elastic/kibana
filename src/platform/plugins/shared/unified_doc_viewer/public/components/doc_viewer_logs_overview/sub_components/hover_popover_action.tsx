/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiPopover,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiToolTip,
  PopoverAnchorPosition,
  type EuiPopoverProps,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTruncateText } from '@kbn/react-hooks';
import { useUIFieldActions } from '../../../hooks/use_field_actions';

interface HoverPopoverActionProps {
  children: React.ReactChild;
  field: string;
  value: unknown;
  formattedValue?: string;
  title?: unknown;
  anchorPosition?: PopoverAnchorPosition;
  display?: EuiPopoverProps['display'];
  truncate?: boolean;
}

const MAX_CHAR_LENGTH = 500;

const readMore = i18n.translate('unifiedDocViewer.observability.traces.details.readMore', {
  defaultMessage: 'Read more',
});

const readLess = i18n.translate('unifiedDocViewer.observability.traces.details.readLess', {
  defaultMessage: 'Read less',
});

export const HoverActionPopover = ({
  children,
  title,
  field,
  value,
  formattedValue,
  anchorPosition = 'upCenter',
  display = 'inline-block',
  truncate,
}: HoverPopoverActionProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);
  const uiFieldActions = useUIFieldActions({ field, value, formattedValue });

  // The timeout hack is required because we are using a Popover which ideally should be used with a mouseclick,
  // but we are using it as a Tooltip. Which means we now need to manually handle the open and close
  // state using the mouse hover events. This cause the popover to close even before the user could
  // navigate actions inside it. Hence, to prevent this, we need this hack
  const onMouseEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
    }
    setIsPopoverOpen(true);
  };

  const getTitleText = () => {
    if (Array.isArray(title)) {
      return title.join(' ');
    } else if (typeof title === 'string') {
      return title;
    }
    return title as string;
  };

  const onMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setIsPopoverOpen(false), 100);
  };
  const titleText = getTitleText();

  const { displayText, isExpanded, toggleExpanded, shouldTruncate } = useTruncateText(
    titleText,
    MAX_CHAR_LENGTH
  );
  const displayTitle = truncate ? displayText : titleText;

  return (
    <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <EuiPopover
        button={children}
        isOpen={isPopoverOpen}
        anchorPosition={shouldTruncate ? 'leftCenter' : anchorPosition}
        closePopover={closePopoverPlaceholder}
        panelPaddingSize="s"
        panelStyle={{ minWidth: '24px' }}
        display={display}
      >
        {(title as string) && (
          <EuiPopoverTitle
            className="eui-textBreakWord"
            css={{
              maxWidth: isExpanded ? '350px' : '300px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {displayTitle}
            {shouldTruncate && truncate && (
              <EuiLink onClick={toggleExpanded}>{isExpanded ? readLess : readMore}</EuiLink>
            )}
          </EuiPopoverTitle>
        )}
        <EuiFlexGroup wrap gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          {uiFieldActions.map((action) => (
            <EuiToolTip content={action.label} key={action.id} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="unifiedDocViewLogsOverviewHoverActionPopoverButton"
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
