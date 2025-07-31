/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, useCallback } from 'react';
import {
  EuiListGroup,
  EuiTitle,
  euiFontSize,
  type UseEuiTheme,
  EuiSpacer,
  EuiAccordion,
} from '@elastic/eui';
import { Theme, css } from '@emotion/react';

import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { SubItemTitle } from '../subitem_title';
import { PanelNavItem } from './panel_nav_item';

const accordionButtonClassName = 'sideNavPanelAccordion__button';

const styles = {
  title: ({ euiTheme }: Theme) => css`
    color: ${euiTheme.colors.textSubdued};
    padding-left: ${euiTheme.size.s};
    padding-top: ${euiTheme.size.s};
    ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xs')}
    font-weight: ${euiTheme.font.weight.medium};
  `,
  panelGroup: ({ euiTheme }: Theme) => css`
    padding: 0 calc(${euiTheme.size.xs} * 2);
  `,
  accordion: ({ euiTheme }: Theme) => css`
    margin-bottom: ${euiTheme.size.s};
    .${accordionButtonClassName} {
      font-weight: ${euiTheme.font.weight.bold};
      ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xs')}
    }
  `,
  listGroup: () => css`
    padding-left: 0;
    padding-right: 0;
    gap: 0;
  `,
  listGroupItemButton: ({ euiTheme }: Theme) => css`
    .euiListGroupItem__button,
    .euiAccordion__button {
      font-weight: ${euiTheme.font.weight.regular};

      &:focus,
      &:hover {
        text-decoration: none;
      }
    }

    &.euiAccordion {
      margin-top: ${euiTheme.size.s};
    }
  `,
};

const someChildIsVisible = (children: ChromeProjectNavigationNode[]) => {
  return children.some((child) => {
    if (child.renderAs === 'item') return true;
    if (child.children) {
      return child.children.every(({ sideNavStatus }) => sideNavStatus !== 'hidden');
    }
    return true;
  });
};

interface Props {
  navNode: ChromeProjectNavigationNode;
  parentId: string;
  nodeIndex: number;
}

export const PanelGroup: FC<Props> = ({ navNode, parentId, nodeIndex }) => {
  const { id, title, spaceBefore: _spaceBefore, withBadge } = navNode;
  const filteredChildren = navNode.children?.filter((child) => child.sideNavStatus !== 'hidden');
  const hasTitle = !!title && title !== '';

  const isFirstInList = nodeIndex === 0;

  const removePaddingTop = !hasTitle && !isFirstInList;
  const groupTestSubj = `panelGroup panelGroupId-${navNode.id}`;

  let spaceBefore = _spaceBefore;
  if (spaceBefore === undefined) {
    if (!hasTitle && isFirstInList) {
      // If the first group has no title, we don't add any space.
      spaceBefore = null;
    }
  }

  const renderChildren = useCallback(
    (parentNode: ChromeProjectNavigationNode) => {
      if (!filteredChildren) return null;

      return filteredChildren.map((item, i) => {
        const isItem = item.renderAs === 'item' || !item.children;
        return isItem ? (
          <PanelNavItem key={item.id} item={item} />
        ) : (
          <PanelGroup navNode={item} parentId={parentNode.id} key={item.id} nodeIndex={i} />
        );
      });
    },
    [filteredChildren]
  );

  if (!filteredChildren?.length || !someChildIsVisible(filteredChildren)) {
    return null;
  }

  if (navNode.renderAs === 'accordion') {
    return (
      <>
        {spaceBefore != null && <EuiSpacer size={spaceBefore} />}
        <EuiAccordion
          id={id}
          buttonContent={withBadge ? <SubItemTitle item={navNode} /> : title}
          arrowDisplay="right"
          css={[styles.panelGroup, styles.listGroupItemButton, styles.accordion]}
          buttonClassName={accordionButtonClassName}
          data-test-subj={groupTestSubj}
          initialIsOpen={navNode.defaultIsCollapsed === false}
          buttonProps={{
            'data-test-subj': `panelAccordionBtnId-${navNode.id}`,
          }}
        >
          {renderChildren(navNode)}
        </EuiAccordion>
      </>
    );
  }

  return (
    <div data-test-subj={groupTestSubj} css={styles.panelGroup}>
      {spaceBefore != null && <EuiSpacer size={spaceBefore} />}
      {hasTitle && (
        <EuiTitle
          size="xs"
          css={styles.title}
          id={`panelGroupTitleId-${navNode.id}`}
          data-test-subj={`panelGroupTitleId-${navNode.id}`}
        >
          <h2>{title}</h2>
        </EuiTitle>
      )}
      <div style={{ paddingTop: removePaddingTop ? 0 : undefined }}>
        <EuiListGroup
          css={[styles.listGroup, styles.listGroupItemButton]}
          aria-labelledby={
            hasTitle ? `panelGroupTitleId-${navNode.id}` : `panelTitleId-${parentId}`
          }
        >
          {renderChildren(navNode)}
        </EuiListGroup>
      </div>
    </div>
  );
};
