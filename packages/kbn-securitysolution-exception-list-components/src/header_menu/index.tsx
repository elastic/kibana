/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiContextMenuPanelProps,
  EuiFlexGroup,
  EuiPopover,
  IconType,
  PopoverAnchorPosition,
} from '@elastic/eui';
import { ButtonContentIconSide } from '@elastic/eui/src/components/button/_button_content_deprecated';

interface Action {
  key: string;
  icon: string;
  label: string | boolean;
  onClick: () => void;
}
interface HeaderMenuComponentProps {
  disableActions: boolean;
  text?: string;
  iconType?: IconType;
  iconSide?: ButtonContentIconSide;
  actions: Action[] | EuiContextMenuPanelProps['items'];
  dataTestSubj?: string;
  emptyButton?: boolean;
  useCustomActions?: boolean;
  anchorPosition?: PopoverAnchorPosition;
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
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onAffectedRulesClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const onClosePopover = () => setIsPopoverOpen(false);

  const itemActions = useMemo((): EuiContextMenuPanelProps['items'] => {
    if (useCustomActions) return actions as EuiContextMenuPanelProps['items'];
    return (actions as Action[]).map((action) => (
      <EuiContextMenuItem
        data-test-subj={`${dataTestSubj || ''}ActionItem${action.key}`}
        key={action.key}
        icon={action.icon}
        layoutAlign="center"
        onClick={() => {
          onClosePopover();
          if (typeof action.onClick === 'function') action.onClick();
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
        panelPaddingSize="s"
        isOpen={isPopoverOpen}
        closePopover={onClosePopover}
        anchorPosition={anchorPosition}
        data-test-subj={`${dataTestSubj || ''}Items`}
      >
        <EuiContextMenuPanel
          data-test-subj={`${dataTestSubj || ''}MenuPanel`}
          size="s"
          items={itemActions}
        />
      </EuiPopover>
    </EuiFlexGroup>
  );
};
HeaderMenuComponent.displayName = 'HeaderMenuComponent';

export const HeaderMenu = React.memo(HeaderMenuComponent);

HeaderMenu.displayName = 'HeaderMenu';
