/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, ReactElement, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiPopover,
  IconType,
  PanelPaddingSize,
  PopoverAnchorPosition,
} from '@elastic/eui';
import { ButtonContentIconSide } from '@elastic/eui/src/components/button/_button_content_deprecated';

export interface Action {
  key: string;
  icon: string;
  label: string | boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent<Element, MouseEvent>) => void;
}
interface HeaderMenuComponentProps {
  disableActions: boolean;
  actions: Action[] | ReactElement[] | null;
  text?: string;
  iconType?: IconType;
  iconSide?: ButtonContentIconSide;
  dataTestSubj?: string;
  emptyButton?: boolean;
  useCustomActions?: boolean;
  anchorPosition?: PopoverAnchorPosition;
  panelPaddingSize?: PanelPaddingSize;
}

const HeaderMenuComponent: FC<HeaderMenuComponentProps> = ({
  text,
  dataTestSubj,
  actions,
  disableActions,
  emptyButton,
  useCustomActions,
  iconType = 'boxesHorizontal',
  iconSide = 'left',
  anchorPosition = 'downCenter',
  panelPaddingSize = 's',
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onAffectedRulesClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const onClosePopover = () => setIsPopoverOpen(false);

  const itemActions = useMemo(() => {
    if (useCustomActions || actions === null) return actions;
    return (actions as Action[]).map((action) => (
      <EuiContextMenuItem
        data-test-subj={`${dataTestSubj || ''}ActionItem${action.key}`}
        key={action.key}
        icon={action.icon}
        disabled={action.disabled}
        layoutAlign="center"
        onClick={(e) => {
          onClosePopover();
          if (typeof action.onClick === 'function') action.onClick(e);
        }}
      >
        {action.label}
      </EuiContextMenuItem>
    ));
  }, [actions, dataTestSubj, useCustomActions]);

  return (
    <EuiFlexGroup responsive>
      <EuiPopover
        button={
          emptyButton ? (
            <EuiButtonEmpty
              isDisabled={disableActions}
              onClick={onAffectedRulesClick}
              iconType={iconType}
              iconSide={iconSide}
              data-test-subj={`${dataTestSubj || ''}EmptyButton`}
              aria-label="Header menu Button Empty"
            >
              {text}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonIcon
              isDisabled={disableActions}
              onClick={onAffectedRulesClick}
              iconType={iconType}
              data-test-subj={`${dataTestSubj || ''}ButtonIcon`}
              aria-label="Header menu Button Icon"
            >
              {text}
            </EuiButtonIcon>
          )
        }
        onClick={(e) => e.stopPropagation()}
        panelPaddingSize={panelPaddingSize}
        isOpen={isPopoverOpen}
        closePopover={onClosePopover}
        anchorPosition={anchorPosition}
        data-test-subj={`${dataTestSubj || ''}Items`}
      >
        {!itemActions ? null : (
          <EuiContextMenuPanel
            data-test-subj={`${dataTestSubj || ''}MenuPanel`}
            size="s"
            items={itemActions as ReactElement[]}
          />
        )}
      </EuiPopover>
    </EuiFlexGroup>
  );
};
HeaderMenuComponent.displayName = 'HeaderMenuComponent';

export const HeaderMenu = React.memo(HeaderMenuComponent);

HeaderMenu.displayName = 'HeaderMenu';
