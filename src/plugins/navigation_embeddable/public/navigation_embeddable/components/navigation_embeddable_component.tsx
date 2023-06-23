/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiListGroup,
  EuiListGroupItemProps,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';

import './navigation_embeddable.scss';
import { NavigationEmbeddableLinkEditor } from './navigation_embeddable_link_editor';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();

  const selectedDashboards = navEmbeddable.select((state) => state.componentState.dashboardLinks);
  const currentDashboardId = navEmbeddable.select(
    (state) => state.componentState.currentDashboardId
  );

  const [isEditPopoverOpen, setIsEditPopoverOpen] = useState(false);
  const [dashboardListGroupItems, setDashboardListGroupItems] = useState<EuiListGroupItemProps[]>(
    []
  );

  useEffect(() => {
    setDashboardListGroupItems(
      (selectedDashboards ?? []).map((dashboard) => {
        return {
          label: dashboard.label || dashboard.title,
          iconType: 'dashboardApp',
          ...(dashboard.id === currentDashboardId
            ? {
                color: 'text',
              }
            : {
                color: 'primary',
                onClick: () => {}, // TODO: connect to drilldown
              }),
        };
      })
    );
  }, [selectedDashboards, currentDashboardId]);

  const onButtonClick = useCallback(() => setIsEditPopoverOpen((isOpen) => !isOpen), []);

  const addLinkButton = (
    <EuiButtonEmpty onClick={onButtonClick} iconType="plusInCircle">
      Add link
    </EuiButtonEmpty>
  );

  // TODO: horizontal VS vertical layout rather than `EuiListGroup`
  return (
    <EuiPanel>
      <EuiListGroup flush listItems={dashboardListGroupItems} size="s" />
      <EuiPopover
        button={addLinkButton}
        panelStyle={{ width: 400 }}
        isOpen={isEditPopoverOpen}
        panelPaddingSize="s"
        closePopover={() => setIsEditPopoverOpen(false)}
      >
        <NavigationEmbeddableLinkEditor setIsPopoverOpen={setIsEditPopoverOpen} />
      </EuiPopover>
    </EuiPanel>
  );
};
