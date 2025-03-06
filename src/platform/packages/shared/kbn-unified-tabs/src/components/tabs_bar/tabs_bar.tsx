/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { Tab, type TabProps } from '../tab';
import type { TabItem } from '../../types';
import { calculateResponsiveTabs } from '../../utils/calculate_responsive_tabs';

const growingFlexItemCss = css`
  min-width: 0;
`;

const tabsContainerCss = css`
  overflow-x: auto;
  max-width: 100%;
`;

export type TabsBarProps = Pick<
  TabProps,
  'getTabMenuItems' | 'onLabelEdited' | 'onSelect' | 'onClose' | 'tabContentId'
> & {
  items: TabItem[];
  selectedItem: TabItem | null;
  onAdd: () => Promise<void>;
};

export const TabsBar: React.FC<TabsBarProps> = ({
  items,
  selectedItem,
  tabContentId,
  getTabMenuItems,
  onAdd,
  onLabelEdited,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const [tabsContainerWithPlus, setTabsContainerWithPlus] = React.useState<HTMLDivElement | null>(
    null
  );
  const dimensions = useResizeObserver(tabsContainerWithPlus);
  const responsiveTabs = useMemo(
    () => calculateResponsiveTabs({ items, containerWidth: dimensions.width }),
    [items, dimensions.width]
  );
  const { visibleItems, tabsSizeConfig } = responsiveTabs;

  const addButtonLabel = i18n.translate('unifiedTabs.createTabButton', {
    defaultMessage: 'New session',
  });

  return (
    <EuiFlexGroup
      role="tablist"
      data-test-subj="unifiedTabs_tabsBar"
      responsive={false}
      alignItems="center"
      gutterSize="s"
      css={css`
        background-color: ${euiTheme.colors.lightestShade};
        padding-right: ${euiTheme.size.xs};
      `}
    >
      <EuiFlexItem ref={setTabsContainerWithPlus} grow css={growingFlexItemCss}>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={growingFlexItemCss}>
            <EuiFlexGroup
              direction="row"
              gutterSize="none"
              alignItems="center"
              responsive={false}
              className="eui-scrollBar"
              css={tabsContainerCss}
            >
              {visibleItems.map((item) => (
                <EuiFlexItem key={item.id} grow={false}>
                  <Tab
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    tabContentId={tabContentId}
                    tabsSizeConfig={tabsSizeConfig}
                    getTabMenuItems={getTabMenuItems}
                    onLabelEdited={onLabelEdited}
                    onSelect={onSelect}
                    onClose={items.length > 1 ? onClose : undefined} // prevents closing the last tab
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="unifiedTabs_tabsBar_newTabBtn"
              iconType="plus"
              color="text"
              aria-label={addButtonLabel}
              title={addButtonLabel}
              onClick={onAdd}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="boxesVertical"
          color="text"
          title="Tabs menu placeholder"
          onClick={() => alert('TODO: Implement tabs menu')}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
