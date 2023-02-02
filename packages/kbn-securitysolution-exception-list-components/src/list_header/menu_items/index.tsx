/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import React, { FC, useMemo } from 'react';
import { HeaderMenu } from '../../header_menu';
import { headerMenuCss, noLinkedRulesCss } from '../list_header.styles';
import * as i18n from '../../translations';
import { Rule } from '../../types';
import { generateLinkedRulesMenuItems } from '../../generate_linked_rules_menu_item';
interface MenuItemsProps {
  isReadonly: boolean;
  dataTestSubj?: string;
  linkedRules: Rule[];
  canUserEditList?: boolean;
  securityLinkAnchorComponent: React.ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  onExportList: () => void;
  onDeleteList: () => void;
  onManageRules: () => void;
}

const MenuItemsComponent: FC<MenuItemsProps> = ({
  dataTestSubj,
  linkedRules,
  securityLinkAnchorComponent,
  isReadonly,
  canUserEditList = true,
  onExportList,
  onDeleteList,
  onManageRules,
}) => {
  const referencedLinks = useMemo(
    () =>
      generateLinkedRulesMenuItems({
        leftIcon: 'check',
        dataTestSubj,
        linkedRules,
        securityLinkAnchorComponent,
      }),
    [dataTestSubj, linkedRules, securityLinkAnchorComponent]
  );
  return (
    <EuiFlexGroup
      direction="row"
      alignItems="baseline"
      justifyContent="center"
      responsive
      data-test-subj={`${dataTestSubj || ''}Container`}
      gutterSize="l"
    >
      <EuiFlexItem css={headerMenuCss}>
        {linkedRules.length ? (
          <HeaderMenu
            dataTestSubj={`${dataTestSubj || ''}LinkedRulesMenu`}
            emptyButton
            useCustomActions
            text={i18n.EXCEPTION_LIST_HEADER_LINKED_RULES(linkedRules.length)}
            actions={referencedLinks}
            disableActions={false}
            iconType="arrowDown"
            iconSide="right"
            panelPaddingSize="none"
          />
        ) : (
          <EuiTextColor data-test-subj="noLinkedRules" css={noLinkedRulesCss} color="subdued">
            {i18n.EXCEPTION_LIST_HEADER_LINKED_RULES(linkedRules.length)}
          </EuiTextColor>
        )}
      </EuiFlexItem>

      {canUserEditList && (
        <EuiFlexItem>
          <EuiButton
            data-test-subj={`${dataTestSubj || ''}ManageRulesButton`}
            fill
            onClick={() => {
              if (typeof onExportList === 'function') onManageRules();
            }}
          >
            {i18n.EXCEPTION_LIST_HEADER_MANAGE_RULES_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <HeaderMenu
          iconType="boxesHorizontal"
          dataTestSubj={`${dataTestSubj || ''}MenuActions`}
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
              disabled: !canUserEditList,
            },
          ]}
          disableActions={isReadonly}
          anchorPosition="downCenter"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

MenuItemsComponent.displayName = 'MenuItemsComponent';

export const MenuItems = React.memo(MenuItemsComponent);

MenuItems.displayName = 'MenuItems';
