/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type KeyboardEventHandler } from 'react';

import type { SidePanelNestedPanelRenderProps } from '@kbn/core-chrome-browser';
import type { MenuItem, SecondaryMenuItem } from '../../types';
import { SideNav } from './side_nav';
import { useNestedMenu } from './nested_secondary_menu/use_nested_menu';
import { NestedPanelContent } from './nested_panel_content';
import { handleRovingIndex } from '../utils/handle_roving_index';

export interface PanelMenuContentProps {
  actualActiveItemId?: string;
  getIsNewSecondary: (id: string) => boolean;
  item: MenuItem;
  navigationInstructionsId?: string;
  onItemClick?: (item: MenuItem | SecondaryMenuItem) => void;
  onSubItemClick?: (subItem: SecondaryMenuItem) => void;
  renderNestedPanel?: (
    panelId: string,
    options?: Pick<SidePanelNestedPanelRenderProps, 'onGoBack'>
  ) => React.ReactNode;
  testSubjPrefix: string;
  visuallyActiveSubpageId?: string;
}

const PanelMenuSections = ({
  actualActiveItemId,
  getIsNewSecondary,
  item,
  navigationInstructionsId,
  onSubItemClick,
  testSubjPrefix,
  visuallyActiveSubpageId,
}: PanelMenuContentProps): JSX.Element => {
  const firstNonEmptySectionIndex = item.sections?.findIndex((section) => section.items.length > 0);

  return (
    <>
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
    </>
  );
};

const PanelMenuMainPanel = (props: PanelMenuContentProps): JSX.Element => {
  const { getIsNewSecondary, item } = props;

  return (
    <SideNav.SecondaryMenu
      badgeType={item.badgeType}
      isPanel
      title={item.label}
      isNew={getIsNewSecondary(item.id)}
    >
      <PanelMenuSections {...props} />
    </SideNav.SecondaryMenu>
  );
};

const PanelMenuNestedPanels = (props: PanelMenuContentProps): JSX.Element => {
  const { canGoBack, goBack } = useNestedMenu();
  const { getIsNewSecondary, item, renderNestedPanel } = props;

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
      <SideNav.SecondaryMenu
        badgeType={item.badgeType}
        isPanel
        title={item.label}
        isNew={getIsNewSecondary(item.id)}
      >
        <SideNav.NestedSecondaryMenu.Panel id={item.id}>
          {({ panelNavigationInstructionsId }) => (
            <PanelMenuSections {...props} navigationInstructionsId={panelNavigationInstructionsId} />
          )}
        </SideNav.NestedSecondaryMenu.Panel>
        {item.panelNestedPanels?.map((panel) => (
          <SideNav.NestedSecondaryMenu.Panel key={panel.id} id={panel.id}>
            {() => <NestedPanelContent panelId={panel.id} renderNestedPanel={renderNestedPanel} />}
          </SideNav.NestedSecondaryMenu.Panel>
        ))}
      </SideNav.SecondaryMenu>
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
