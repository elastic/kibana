/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useMemo, useState } from 'react';
import type { EuiContextMenuPanelProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
  EuiContextMenuItem,
} from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

export interface ExceptionItemCardHeaderProps {
  item: ExceptionListItemSchema;
  actions: Array<{ key: string; icon: string; label: string | boolean; onClick: () => void }>;
  disableActions?: boolean;
  dataTestSubj: string;
}

export const ExceptionItemCardHeader = memo<ExceptionItemCardHeaderProps>(
  ({ item, actions, disableActions = false, dataTestSubj }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onItemActionsClick = () => setIsPopoverOpen((isOpen) => !isOpen);
    const onClosePopover = () => setIsPopoverOpen(false);

    const itemActions = useMemo((): EuiContextMenuPanelProps['items'] => {
      return actions.map((action) => (
        <EuiContextMenuItem
          data-test-subj={`${dataTestSubj}ActionItem${action.key}`}
          key={action.key}
          icon={action.icon}
          onClick={() => {
            onClosePopover();
            action.onClick();
          }}
        >
          {action.label}
        </EuiContextMenuItem>
      ));
    }, [dataTestSubj, actions]);

    return (
      <EuiFlexGroup data-test-subj={dataTestSubj} justifyContent="spaceBetween">
        <EuiFlexItem grow={9}>
          <EuiTitle size="xs" textTransform="uppercase" data-test-subj={`${dataTestSubj}Title`}>
            <h3>{item.name}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonIcon
                isDisabled={disableActions}
                aria-label="Exception item actions menu"
                iconType="boxesHorizontal"
                onClick={onItemActionsClick}
                data-test-subj={`${dataTestSubj}ActionButton`}
              />
            }
            panelPaddingSize="none"
            isOpen={isPopoverOpen}
            closePopover={onClosePopover}
            data-test-subj={`${dataTestSubj}Items`}
          >
            <EuiContextMenuPanel size="s" items={itemActions} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionItemCardHeader.displayName = 'ExceptionItemCardHeader';
