/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type KeyboardEventHandler } from 'react';

import type { MenuItem, SecondaryMenuItem } from '../../types';
import { usePanelHeaderActions } from '../hooks/use_panel_header_actions';
import { SideNav } from './side_nav';
import { useNestedMenu } from './nested_secondary_menu/use_nested_menu';
import { handleRovingIndex } from '../utils/handle_roving_index';

export interface PanelMenuContentProps {
  actualActiveItemId?: string;
  getIsNewSecondary: (id: string) => boolean;
  item: MenuItem;
  navigationInstructionsId?: string;
  onItemClick?: (item: MenuItem | SecondaryMenuItem) => void;
  onSubItemClick?: (subItem: SecondaryMenuItem) => void;
  renderNestedPanel?: (panelId: string) => React.ReactNode;
  testSubjPrefix: string;
  visuallyActiveSubpageId?: string;
}

const PanelMenuMainPanel = ({
  actualActiveItemId,
  getIsNewSecondary,
  item,
  navigationInstructionsId,
  onSubItemClick,
  testSubjPrefix,
  visuallyActiveSubpageId,
}: PanelMenuContentProps): JSX.Element => {
  const panelHeaderActions = usePanelHeaderActions(item.panelHeaderActions);
  const firstNonEmptySectionIndex = item.sections?.findIndex((section) => section.items.length > 0);

  return (
    <SideNav.SecondaryMenu
      badgeType={item.badgeType}
      isPanel
      panelHeaderActions={panelHeaderActions}
      title={item.label}
      isNew={getIsNewSecondary(item.id)}
    >
      {item.sections?.map((section, sectionIndex) => (
        <SideNav.SecondaryMenu.Section
          key={section.id}
          animateItemReorder={section.animateItemReorder}
          label={section.label}
        >
          {section.items.map((subItem, subItemIndex) => {
            const isFirstItem = sectionIndex === firstNonEmptySectionIndex && subItemIndex === 0;
            const ariaDescribedBy = isFirstItem ? navigationInstructionsId : undefined;

            return (
              <SideNav.SecondaryMenu.Item
                aria-describedby={ariaDescribedBy}
                key={subItem.id}
                isCurrent={actualActiveItemId === subItem.id}
                isHighlighted={subItem.id === visuallyActiveSubpageId}
                isNew={getIsNewSecondary(subItem.id)}
                onClick={() => onSubItemClick?.(subItem)}
                testSubjPrefix={testSubjPrefix}
                {...subItem}
              >
                {subItem.label}
              </SideNav.SecondaryMenu.Item>
            );
          })}
        </SideNav.SecondaryMenu.Section>
      ))}
    </SideNav.SecondaryMenu>
  );
};

const PanelMenuNestedPanels = (props: PanelMenuContentProps): JSX.Element => {
  const { canGoBack, goBack } = useNestedMenu();
  const { item, renderNestedPanel } = props;

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.key === 'Escape' && canGoBack) {
        event.preventDefault();
        goBack();
        return;
      }

      handleRovingIndex(event);
    },
    [canGoBack, goBack]
  );

  return (
    <div onKeyDown={handleKeyDown}>
      <SideNav.NestedSecondaryMenu.Panel id={item.id}>
        {() => <PanelMenuMainPanel {...props} />}
      </SideNav.NestedSecondaryMenu.Panel>
      {item.panelNestedPanels?.map((panel) => (
        <SideNav.NestedSecondaryMenu.Panel key={panel.id} id={panel.id}>
          {({ panelNavigationInstructionsId }) => (
            <>
              <SideNav.NestedSecondaryMenu.Header
                title={panel.title}
                aria-describedby={panelNavigationInstructionsId}
              />
              {renderNestedPanel?.(panel.id)}
            </>
          )}
        </SideNav.NestedSecondaryMenu.Panel>
      ))}
    </div>
  );
};

export const PanelMenuContent = ({ item, onItemClick, ...props }: PanelMenuContentProps): JSX.Element => {
  const onSubItemClick = props.onSubItemClick ?? onItemClick;

  const contentProps = {
    ...props,
    item,
    onItemClick,
    onSubItemClick,
  };

  if (!item.panelNestedPanels?.length) {
    return <PanelMenuMainPanel {...contentProps} />;
  }

  return (
    <SideNav.NestedSecondaryMenu initialPanel={item.id}>
      <PanelMenuNestedPanels {...contentProps} />
    </SideNav.NestedSecondaryMenu>
  );
};
