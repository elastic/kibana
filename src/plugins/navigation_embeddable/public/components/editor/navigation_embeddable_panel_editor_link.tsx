/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  EuiText,
  EuiIcon,
  EuiPanel,
  EuiToolTip,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiSkeletonTitle,
  DraggableProvidedDragHandleProps,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import {
  NavigationLinkInfo,
  DASHBOARD_LINK_TYPE,
  NavigationEmbeddableLink,
} from '../../embeddable/types';
import { fetchDashboard } from '../dashboard_link/dashboard_link_tools';
import { NavEmbeddableStrings } from '../navigation_embeddable_strings';
import { DashboardLinkStrings } from '../dashboard_link/dashboard_link_strings';

export const NavigationEmbeddablePanelEditorLink = ({
  link,
  editLink,
  deleteLink,
  parentDashboard,
  dragHandleProps,
}: {
  editLink: () => void;
  deleteLink: () => void;
  link: NavigationEmbeddableLink;
  parentDashboard?: DashboardContainer;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) => {
  const [dashboardError, setDashboardError] = useState<Error | undefined>();
  const parentDashboardTitle = parentDashboard?.select((state) => state.explicitInput.title);
  const parentDashboardId = parentDashboard?.select((state) => state.componentState.lastSavedId);

  const { value: linkLabel, loading: linkLabelLoading } = useAsync(async () => {
    if (link.type === DASHBOARD_LINK_TYPE) {
      if (parentDashboardId === link.destination) {
        return link.label || parentDashboardTitle;
      } else {
        const dashboard = await fetchDashboard(link.destination).catch((error) =>
          setDashboardError(error)
        );
        return (
          link.label ||
          (dashboard ? dashboard.attributes.title : DashboardLinkStrings.getDashboardErrorLabel())
        );
      }
    } else {
      return link.label || link.destination;
    }
  }, [link]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      className={`navEmbeddableLinkPanel ${dashboardError ? 'linkError' : ''}`}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} wrap={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPanel
            color="transparent"
            paddingSize="none"
            {...dragHandleProps}
            aria-label={NavEmbeddableStrings.editor.panelEditor.getDragHandleAriaLabel()}
          >
            <EuiIcon type="grab" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem className="navEmbeddableLinkText">
          <EuiToolTip content={dashboardError ? dashboardError.message : ''} display="block">
            <EuiFlexGroup gutterSize="s" responsive={false} wrap={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={dashboardError ? 'warning' : NavigationLinkInfo[link.type].icon}
                  color={dashboardError ? 'warning' : 'text'}
                />
              </EuiFlexItem>

              <EuiFlexItem className="navEmbeddableLinkText">
                <EuiSkeletonTitle
                  size="xxxs"
                  isLoading={linkLabelLoading}
                  contentAriaLabel={NavEmbeddableStrings.editor.panelEditor.getLinkLoadingAriaLabel()}
                >
                  <EuiText size="s" color={'text'} className="wrapText">
                    {linkLabel}
                  </EuiText>
                </EuiSkeletonTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" responsive={false} className="navEmbeddable_hoverActions">
            <EuiFlexItem>
              <EuiToolTip content={NavEmbeddableStrings.editor.getEditLinkTitle()}>
                <EuiButtonIcon
                  size="xs"
                  iconType="pencil"
                  onClick={editLink}
                  aria-label={NavEmbeddableStrings.editor.getEditLinkTitle()}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiToolTip content={NavEmbeddableStrings.editor.getDeleteLinkTitle()}>
                <EuiButtonIcon
                  size="xs"
                  iconType="trash"
                  aria-label={NavEmbeddableStrings.editor.getDeleteLinkTitle()}
                  color="danger"
                  onClick={deleteLink}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
