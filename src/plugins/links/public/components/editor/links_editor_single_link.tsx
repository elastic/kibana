/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useMemo } from 'react';

import {
  EuiText,
  EuiIcon,
  EuiPanel,
  EuiToolTip,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  DraggableProvidedDragHandleProps,
} from '@elastic/eui';

import { LinkInfo } from './constants';
import { LinksStrings } from '../links_strings';
import { DashboardLinkStrings } from '../dashboard_link/dashboard_link_strings';
import { DASHBOARD_LINK_TYPE } from '../../../common/content_management';
import { ResolvedLink } from '../../types';

export const LinksEditorSingleLink = ({
  link,
  editLink,
  deleteLink,
  dragHandleProps,
}: {
  editLink: () => void;
  deleteLink: () => void;
  link: ResolvedLink;
  dragHandleProps?: DraggableProvidedDragHandleProps;
}) => {
  const LinkLabel = useMemo(() => {
    const labelText = (
      <EuiFlexGroup tabIndex={0} gutterSize="s" responsive={false} wrap={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={link.error ? 'warning' : LinkInfo[link.type].icon}
            color={link.error ? 'warning' : 'text'}
            aria-label={
              link.error
                ? LinksStrings.editor.panelEditor.getBrokenDashboardLinkAriaLabel()
                : LinkInfo[link.type].type
            }
          />
        </EuiFlexItem>

        <EuiFlexItem
          className={classNames('linksPanelEditorLinkText', {
            'linksPanelEditorLinkText--noLabel': !link.label,
          })}
        >
          <EuiText size="s" color={'default'} className="eui-textTruncate">
            {link.label || link.title}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return () =>
      link.error ? (
        <EuiToolTip
          content={link.error.message}
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
  }, [link]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      color={link.error ? 'warning' : 'plain'}
      className={`linksPanelEditorLink ${link.error ? 'linkError' : ''}`}
      data-test-subj={`panelEditorLink''}`}
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
        <EuiFlexItem className="linksPanelEditorLinkText">
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
                  aria-label={LinksStrings.editor.getEditLinkTitle(link.title)}
                  data-test-subj="panelEditorLink--editBtn"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiToolTip content={LinksStrings.editor.getDeleteLinkTitle()}>
                <EuiButtonIcon
                  size="xs"
                  iconType="trash"
                  aria-label={LinksStrings.editor.getDeleteLinkTitle(link.title)}
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
