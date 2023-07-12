/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  EuiIcon,
  EuiPanel,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiSkeletonTitle,
  DraggableProvidedDragHandleProps,
} from '@elastic/eui';

import {
  NavigationLinkInfo,
  DASHBOARD_LINK_TYPE,
  NavigationEmbeddableLink,
} from '../embeddable/types';
import { fetchDashboard } from './dashboard_link/dashboard_link_tools';

export const NavigationEmbeddablePanelEditorLink = ({
  link,
  editLink,
  deleteLink,
  dragHandleProps,
}: {
  editLink: () => void;
  deleteLink: () => void;
  link: NavigationEmbeddableLink;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) => {
  const { value: linkLabel, loading: linkLabelLoading } = useAsync(async () => {
    let label = link.label;
    if (link.type === DASHBOARD_LINK_TYPE && !label) {
      const dashboard = await fetchDashboard(link.destination);
      label = dashboard.attributes.title;
    }
    return label || link.destination;
  }, [link]);

  return (
    <EuiPanel hasBorder paddingSize="s" hasShadow={false} className="navEmbeddablePanelEditor">
      <EuiFlexGroup gutterSize="s" responsive={false} wrap={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPanel
            color="transparent"
            paddingSize="none"
            {...dragHandleProps}
            aria-label="Drag Handle"
          >
            <EuiIcon type="grab" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={NavigationLinkInfo[link.type].icon} color="text" />
        </EuiFlexItem>
        <EuiFlexItem className="linkText">
          <EuiSkeletonTitle
            size="xxxs"
            isLoading={linkLabelLoading}
            contentAriaLabel="Demo skeleton title"
          >
            <div className="wrapText">{linkLabel}</div>
          </EuiSkeletonTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" responsive={false} className="navEmbeddable_hoverActions">
            <EuiFlexItem>
              <EuiButtonIcon size="xs" iconType="pencil" aria-label="Edit" onClick={editLink} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonIcon
                size="xs"
                iconType="trash"
                aria-label="Delete"
                color="danger"
                onClick={deleteLink}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
