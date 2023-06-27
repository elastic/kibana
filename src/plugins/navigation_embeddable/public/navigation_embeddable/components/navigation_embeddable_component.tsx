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
  const currentDashboard = navEmbeddable.select((state) => state.componentState.currentDashboard);

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
            ...(link.id === currentDashboard?.id
              ? {
                  color: 'text',
                }
              : {
                  color: 'primary',
                  onClick: () => {}, // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
                }),
          };
        }
        return {
          label: link.label || link.url,
          iconType: 'link',
          color: 'primary',
          onClick: () => {}, // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
        };
      })
    );
  }, [links, currentDashboard]);

  const onButtonClick = useCallback(() => setIsEditPopoverOpen((isOpen) => !isOpen), []);

  const addLinkButton = (
    <EuiButtonEmpty onClick={onButtonClick} iconType="plusInCircle">
      Add link
    </EuiButtonEmpty>
  );

  // TODO: As part of https://github.com/elastic/kibana/issues/154357, replace `EuiListGroup` with horizontal VS vertical layout
  return (
    <EuiPanel className="eui-yScroll">
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
