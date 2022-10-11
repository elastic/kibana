/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { FC, memo } from 'react';
import { HeaderMenu } from '../../header_menu';
import { headerMenuCss } from '../exception_list_header.styles';
import * as i18n from '../../translations';

interface MenuItemsProps {
  isReadonly: boolean;
  dataTestSubj?: string;
  // linkedRules:[]
  onExportList: () => void;
  onDeleteList: () => void;
}

const MenuItemsComponent: FC<MenuItemsProps> = memo(
  ({ isReadonly, onExportList, dataTestSubj, onDeleteList }) => {
    return (
      <EuiFlexGroup
        direction="row"
        alignItems="baseline"
        justifyContent="center"
        responsive
        data-test-subj={`${dataTestSubj || ''}MenuItems`}
        gutterSize="l"
      >
        <EuiFlexItem css={headerMenuCss}>
          <HeaderMenu
            data-test-subj={`${dataTestSubj || ''}LinkedRulesMenu`}
            emptyButton
            text={i18n.EXCEPTION_LIST_HEADER_LINKED_RULES(4)} // TODO add reference no.
            actions={[]}
            disableActions={isReadonly}
            iconType="arrowDown"
            iconSide="right"
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiButton data-test-subj={`${dataTestSubj || ''}ManageRulesButton`} fill>
            {i18n.EXCEPTION_LIST_HEADER_MANAGE_RULES_BUTTON}
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem>
          <HeaderMenu
            actions={[
              {
                key: '1',
                icon: 'exportAction',
                label: i18n.EXCEPTION_LIST_HEADER_EXPORT_ACTION,
                onClick: () => {
                  if (typeof onExportList === 'function') onExportList();
                },
              },
              {
                key: '2',
                icon: 'trash',
                label: i18n.EXCEPTION_LIST_HEADER_DELETE_ACTION,
                onClick: () => {
                  if (typeof onDeleteList === 'function') onDeleteList();
                },
              },
            ]}
            disableActions={isReadonly}
            anchorPosition="downCenter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

MenuItemsComponent.displayName = 'MenuItemsComponent';

export const MenuItems = React.memo(MenuItemsComponent);

MenuItems.displayName = 'MenuItems';
