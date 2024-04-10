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

import { LinkInfo } from '../../embeddable/types';
import { validateUrl } from '../external_link/external_link_tools';
import { fetchDashboard } from '../dashboard_link/dashboard_link_tools';
import { LinksStrings } from '../links_strings';
import { DashboardLinkStrings } from '../dashboard_link/dashboard_link_strings';
import { DASHBOARD_LINK_TYPE, Link } from '../../../common/content_management';

export const LinksEditorSingleLink = ({
  link,
  editLink,
  deleteLink,
  parentDashboard,
  dragHandleProps,
}: {
  editLink: () => void;
  deleteLink: () => void;
  link: Link;
  parentDashboard?: DashboardContainer;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) => {
  const [destinationError, setDestinationError] = useState<Error | undefined>();
  const parentDashboardTitle = parentDashboard?.select((state) => state.explicitInput.title);
  const parentDashboardId = parentDashboard?.select((state) => state.componentState.lastSavedId);

  const { value: linkLabel, loading: linkLabelLoading } = useAsync(async () => {
    if (!link.destination) {
      setDestinationError(new Error(DashboardLinkStrings.getDashboardErrorLabel()));
      return;
    }

    if (link.type === DASHBOARD_LINK_TYPE) {
      if (parentDashboardId === link.destination) {
        return link.label || parentDashboardTitle;
      } else {
        const dashboard = await fetchDashboard(link.destination)
          .then((result) => {
            setDestinationError(undefined);
            return result;
          })
          .catch((error) => setDestinationError(error));
        return (
          link.label ||
          (dashboard ? dashboard.attributes.title : DashboardLinkStrings.getDashboardErrorLabel())
        );
      }
    } else {
      const { valid, message } = validateUrl(link.destination);
      if (!valid && message) {
        setDestinationError(new Error(message));
      }
      return link.label || link.destination;
    }
  }, [link]);

  const LinkLabel = useMemo(() => {
    const labelText = (
      <EuiFlexGroup tabIndex={0} gutterSize="s" responsive={false} wrap={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={destinationError ? 'warning' : LinkInfo[link.type].icon}
            color={destinationError ? 'warning' : 'text'}
            aria-label={
              destinationError
                ? LinksStrings.editor.panelEditor.getBrokenDashboardLinkAriaLabel()
                : LinkInfo[link.type].type
            }
          />
        </EuiFlexItem>

        <EuiFlexItem
          className={classNames('linksPanelLinkText', {
            'linksPanelLinkText--noLabel': !link.label,
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
      destinationError ? (
        <EuiToolTip
          content={destinationError.message}
          title={
            link.type === DASHBOARD_LINK_TYPE
              ? DashboardLinkStrings.getDashboardErrorLabel()
              : undefined // the messages thrown by an invalid URL are clear enough without an extra title
          }
        >
          {labelText}
        </EuiToolTip>
      ) : (
        labelText
      );
  }, [linkLabel, linkLabelLoading, destinationError, link.label, link.type]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      color={destinationError ? 'warning' : 'plain'}
      className={`linksPanelLink ${destinationError ? 'linkError' : ''}`}
      data-test-subj={`panelEditorLink${linkLabelLoading ? '--loading' : ''}`}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} wrap={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPanel
            color="transparent"
            paddingSize="none"
            {...dragHandleProps}
            aria-label={LinksStrings.editor.panelEditor.getDragHandleAriaLabel()}
            data-test-subj="panelEditorLink--dragHandle"
          >
            <EuiIcon type="grab" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem className="linksPanelLinkText">
          <LinkLabel />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" responsive={false} className="links_hoverActions">
            <EuiFlexItem>
              <EuiToolTip content={LinksStrings.editor.getEditLinkTitle()}>
                <EuiButtonIcon
                  size="xs"
                  iconType="pencil"
                  onClick={editLink}
                  aria-label={LinksStrings.editor.getEditLinkTitle(linkLabel)}
                  data-test-subj="panelEditorLink--editBtn"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiToolTip content={LinksStrings.editor.getDeleteLinkTitle()}>
                <EuiButtonIcon
                  size="xs"
                  iconType="trash"
                  aria-label={LinksStrings.editor.getDeleteLinkTitle(linkLabel)}
                  color="danger"
                  onClick={deleteLink}
                  data-test-subj="panelEditorLink--deleteBtn"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
