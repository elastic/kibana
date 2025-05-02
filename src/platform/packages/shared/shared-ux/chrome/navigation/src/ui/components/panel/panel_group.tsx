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
  useEuiTheme,
  euiFontSize,
  type EuiThemeComputed,
  type UseEuiTheme,
  EuiSpacer,
  EuiAccordion,
} from '@elastic/eui';
import { css } from '@emotion/css';

import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { SubItemTitle } from '../subitem_title';
import { PanelNavItem } from './panel_nav_item';

const accordionButtonClassName = 'sideNavPanelAccordion__button';

const getClassnames = (euiTheme: EuiThemeComputed<{}>) => ({
  title: css`
    color: ${euiTheme.colors.textSubdued};
    padding-left: ${euiTheme.size.s};
    padding-bottom: ${euiTheme.size.s};
    ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xs')}
    font-weight: ${euiTheme.font.weight.medium};
  `,
  accordion: css`
    margin-bottom: ${euiTheme.size.s};
    .${accordionButtonClassName} {
      font-weight: ${euiTheme.font.weight.bold};
      ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xs')}
    }
  `,
});

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
  nodeIndex: number;
}

export const PanelGroup: FC<Props> = ({ navNode, nodeIndex }) => {
  const { euiTheme } = useEuiTheme();
  const { id, title, spaceBefore: _spaceBefore, withBadge } = navNode;
  const filteredChildren = navNode.children?.filter((child) => child.sideNavStatus !== 'hidden');
  const classNames = getClassnames(euiTheme);
  const hasTitle = !!title && title !== '';

  const isFirstInList = nodeIndex === 0;

  const removePaddingTop = !hasTitle && !isFirstInList;
  const someChildIsGroup = filteredChildren?.some((child) => !!child.children);
  const firstChildIsGroup = !!filteredChildren?.[0]?.children;
  const groupTestSubj = `panelGroup panelGroupId-${navNode.id}`;

  let spaceBefore = _spaceBefore;
  if (spaceBefore === undefined) {
    if (!hasTitle && isFirstInList) {
      // If the first group has no title, we don't add any space.
      spaceBefore = null;
    }
  }

  const renderChildren = useCallback(() => {
    if (!filteredChildren) return null;

    return filteredChildren.map((item, i) => {
      const isItem = item.renderAs === 'item' || !item.children;
      return isItem ? (
        <PanelNavItem key={item.id} item={item} />
      ) : (
        <PanelGroup navNode={item} key={item.id} nodeIndex={i} />
      );
    });
  }, [filteredChildren]);

  if (!filteredChildren?.length || !someChildIsVisible(filteredChildren)) {
    return null;
  }

  if (navNode.renderAs === 'accordion') {
    return (
      <>
        {spaceBefore !== null && <EuiSpacer size={spaceBefore} />}
        <EuiAccordion
          id={id}
          buttonContent={withBadge ? <SubItemTitle item={navNode} /> : title}
          arrowDisplay="right"
          className={classNames.accordion}
          buttonClassName={accordionButtonClassName}
          data-test-subj={groupTestSubj}
          initialIsOpen={navNode.defaultIsCollapsed === false}
          buttonProps={{
            'data-test-subj': `panelAccordionBtnId-${navNode.id}`,
          }}
        >
          <>
            {!firstChildIsGroup && <EuiSpacer size="s" />}
            {renderChildren()}
          </>
        </EuiAccordion>
      </>
    );
  }

  return (
    <div data-test-subj={groupTestSubj}>
      {spaceBefore !== null && <EuiSpacer size={spaceBefore} />}
      {hasTitle && (
        <EuiTitle
          size="xs"
          className={classNames.title}
          data-test-subj={`panelGroupTitleId-${navNode.id}`}
        >
          <h2>{title}</h2>
        </EuiTitle>
      )}
      <EuiListGroup
        css={{
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: removePaddingTop ? 0 : undefined,
          // Remove the gap between groups if some items are groups
          gap: someChildIsGroup ? 0 : undefined,
        }}
      >
        {renderChildren()}
      </EuiListGroup>
    </div>
  );
};
