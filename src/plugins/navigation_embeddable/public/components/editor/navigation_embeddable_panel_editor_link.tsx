/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useMemo, useState } from 'react';
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

import { NavigationLinkInfo } from '../../embeddable/types';
import { fetchDashboard } from '../dashboard_link/dashboard_link_tools';
import { NavEmbeddableStrings } from '../navigation_embeddable_strings';
import { DashboardLinkStrings } from '../dashboard_link/dashboard_link_strings';
import { DASHBOARD_LINK_TYPE, NavigationEmbeddableLink } from '../../../common/content_management';

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
        const dashboard = await fetchDashboard(link.destination)
          .then((result) => {
            setDashboardError(undefined);
            return result;
          })
          .catch((error) => setDashboardError(error));
        return (
          link.label ||
          (dashboard ? dashboard.attributes.title : DashboardLinkStrings.getDashboardErrorLabel())
        );
      }
    } else {
      return link.label || link.destination;
    }
  }, [link]);

  const LinkLabel = useMemo(() => {
    const labelText = (
      <EuiFlexGroup tabIndex={0} gutterSize="s" responsive={false} wrap={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={dashboardError ? 'warning' : NavigationLinkInfo[link.type].icon}
            color={dashboardError ? 'warning' : 'text'}
            aria-label={
              dashboardError
                ? NavEmbeddableStrings.editor.panelEditor.getBrokenDashboardLinkAriaLabel()
                : NavigationLinkInfo[link.type].type
            }
          />
        </EuiFlexItem>

        <EuiFlexItem
          className={classNames('navEmbeddableLinkText', {
            'navEmbeddableLinkText--noLabel': !link.label,
          })}
        >
          <EuiSkeletonTitle
            size="xxxs"
            isLoading={linkLabelLoading}
            announceLoadedStatus={false}
            announceLoadingStatus={false}
          >
            <EuiText size="s" color={'default'} className="eui-textTruncate">
              {linkLabel}
            </EuiText>
          </EuiSkeletonTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return () =>
      dashboardError ? (
        <EuiToolTip
          content={dashboardError.message}
          title={DashboardLinkStrings.getDashboardErrorLabel()}
        >
          {labelText}
        </EuiToolTip>
      ) : (
        labelText
      );
  }, [linkLabel, linkLabelLoading, dashboardError, link.label, link.type]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      color={dashboardError ? 'warning' : 'plain'}
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
          <LinkLabel />
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
