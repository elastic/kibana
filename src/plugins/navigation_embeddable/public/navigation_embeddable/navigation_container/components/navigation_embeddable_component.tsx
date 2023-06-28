/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EuiPanel, EuiPopover, EuiButtonEmpty } from '@elastic/eui';

import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { NavigationEmbeddableEditor } from './navigation_embeddable_editor';
import { useNavigationEmbeddable } from '../embeddable/navigation_container';

import './navigation_embeddable.scss';
import { map } from 'lodash';
import { panelPaddingOffset } from '@elastic/eui/src/components/popover/popover_footer.styles';
import { NavigationEmbeddableLink, useChildEmbeddable } from './navigation_embeddable_link';

export const NavigationEmbeddableComponent = () => {
  const navEmbeddable = useNavigationEmbeddable();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const panels = navEmbeddable.select((state) => state.explicitInput.panels);

  // useEffect(() => {
  //   const embeddable = useChildEmbeddable({
  //     untilEmbeddableLoaded: navEmbeddable.untilEmbeddableLoaded.bind(navEmbeddable),
  //     embeddableType,
  //     embeddableId,
  //   });

  //   if (embeddableRoot.current) {
  //     embeddable?.render(embeddableRoot.current);
  //   }
  //   const inputSubscription = embeddable
  //     ?.getInput$()
  //     .subscribe((newInput) => setTitle(newInput.title));
  //   return () => {
  //     inputSubscription?.unsubscribe();
  //   };
  // }, [embeddable, embeddableRoot]);

  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => setIsAddPopoverOpen((isOpen) => !isOpen), []);

  const addLinkButton = (
    <EuiButtonEmpty onClick={onButtonClick} iconType="plusInCircle">
      {NavEmbeddableStrings.component.getAddButtonLabel()}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel className="eui-yScroll">
      <div ref={embeddableRoot}>
        {Object.keys(panels).map((panelId) => {
          return (
            <NavigationEmbeddableLink
              embeddableId={panels[panelId].explicitInput.id}
              embeddableType={panels[panelId].type}
            />
          );
        })}
      </div>
      <EuiPopover
        button={addLinkButton}
        panelStyle={{ width: 400 }}
        isOpen={isAddPopoverOpen}
        panelPaddingSize="m"
        closePopover={() => setIsAddPopoverOpen(false)}
      >
        <NavigationEmbeddableEditor closePopover={() => setIsAddPopoverOpen(false)} />
      </EuiPopover>
    </EuiPanel>
  );

  // const links = navEmbeddable.select((state) => state.componentState.links);
  // const canEdit = navEmbeddable.select((state) => state.componentState.canEdit);
  // const currentDashboard = navEmbeddable.select((state) => state.componentState.currentDashboard);

  // const [isEditPopoverOpen, setIsEditPopoverOpen] = useState(false);
  // const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  // const [dashboardListGroupItems, setDashboardListGroupItems] = useState<EuiListGroupItemProps[]>(
  //   []
  // );

  // const editPopoverContainer = useRef<HTMLDivElement | null>(null);
  // const editPopoverAnchor = useRef<HTMLButtonElement | null>(null);
  // const [editIndex, setEditIndex] = useState<number>();

  // const closeEditPopover = useCallback(() => {
  //   setIsEditPopoverOpen(false);

  //   if (!editPopoverContainer.current) return;

  //   ReactDOM.unmountComponentAtNode(editPopoverContainer.current);
  //   document.body.removeChild(editPopoverContainer.current);
  //   editPopoverContainer.current = null;
  // }, []);

  // useEffect(() => {
  //   if (!editPopoverAnchor.current) return;

  //   if (isEditPopoverOpen && editIndex !== undefined && !editPopoverContainer.current) {
  //     console.log('use effect', editIndex);
  //     const container = document.createElement('div');
  //     editPopoverContainer.current = container;
  //     document.body.appendChild(container);
  //     const element = (
  //       <EditPopover
  //         linkIndex={editIndex}
  //         embeddable={navEmbeddable}
  //         anchor={editPopoverAnchor.current}
  //         closePopover={closeEditPopover}
  //       />
  //     );
  //     ReactDOM.render(element, editPopoverContainer.current);
  //   } else {
  //     closeEditPopover();
  //   }
  // }, [navEmbeddable, editIndex, isEditPopoverOpen, closeEditPopover]);

  // useEffect(() => {
  //   setDashboardListGroupItems(
  //     (links ?? []).map((link, i) => {
  //       const editAction: EuiListGroupItemExtraActionProps = {
  //         iconType: 'pencil',
  //         onClick: (e) => {
  //           editPopoverAnchor.current = e.target as HTMLButtonElement;
  //           setEditIndex(i);
  //           setIsEditPopoverOpen(!isEditPopoverOpen);
  //         },
  //         'aria-label': 'Edit link',
  //       };

  //       if (isDashboardLink(link)) {
  //         return {
  //           label: link.label || link.title,
  //           iconType: 'dashboardApp',
  //           extraAction: canEdit ? editAction : undefined,
  //           ...(link.id === currentDashboard?.id
  //             ? {
  //                 color: 'text',
  //               }
  //             : {
  //                 color: 'primary',
  //                 onClick: () => {}, // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
  //               }),
  //         };
  //       }
  //       return {
  //         label: link.label || link.url,
  //         iconType: 'link',
  //         color: 'primary',
  //         extraAction: canEdit ? editAction : undefined,
  //         onClick: () => {}, // TODO: As part of https://github.com/elastic/kibana/issues/154381, connect to drilldown
  //       };
  //     })
  //   );
  // }, [links, isEditPopoverOpen, canEdit, currentDashboard]);

  // const onButtonClick = useCallback(() => setIsAddPopoverOpen((isOpen) => !isOpen), []);

  // const addLinkButton = (
  //   <EuiButtonEmpty onClick={onButtonClick} iconType="plusInCircle">
  //     {NavEmbeddableStrings.component.getAddButtonLabel()}
  //   </EuiButtonEmpty>
  // );

  // // TODO: As part of https://github.com/elastic/kibana/issues/154357, replace `EuiListGroup` with horizontal VS vertical layout
  // return (
  //   <EuiPanel className="eui-yScroll">
  //     <EuiListGroup flush maxWidth="none" listItems={dashboardListGroupItems} size="s" />
  //     {canEdit && (
  // <EuiPopover
  //   button={addLinkButton}
  //   panelStyle={{ width: NAV_EMBEDDABLE_POPOVER_WIDTH }}
  //   isOpen={isAddPopoverOpen}
  //   panelPaddingSize="m"
  //   closePopover={() => setIsAddPopoverOpen(false)}
  // >
  //   <NavigationEmbeddableEditor closePopover={() => setIsAddPopoverOpen(false)} />
  // </EuiPopover>
  //     )}
  //   </EuiPanel>
  // );
};
