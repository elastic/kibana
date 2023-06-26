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

import { isDashboardLink } from '../types';
import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { NavigationEmbeddableLinkEditor } from './navigation_embeddable_link_editor';

import './navigation_embeddable.scss';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();

  const links = navEmbeddable.select((state) => state.componentState.links);
  const currentDashboardId = navEmbeddable.select(
    (state) => state.componentState.currentDashboardId
  );

  const [isEditPopoverOpen, setIsEditPopoverOpen] = useState(false);
  const [dashboardListGroupItems, setDashboardListGroupItems] = useState<EuiListGroupItemProps[]>(
    []
  );

  useEffect(() => {
    setDashboardListGroupItems(
      (links ?? []).map((link) => {
        if (isDashboardLink(link)) {
          return {
            label: link.label || link.title,
            iconType: 'dashboardApp',
            ...(link.id === currentDashboardId
              ? {
                  color: 'text',
                }
              : {
                  color: 'primary',
                  onClick: () => {}, // TODO: connect to drilldown
                }),
          };
        }
        return {
          label: link.label || link.url,
          iconType: 'link',
          color: 'primary',
          onClick: () => {}, // TODO: connect to drilldown
        };
      })
    );
  }, [links, currentDashboardId]);

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
