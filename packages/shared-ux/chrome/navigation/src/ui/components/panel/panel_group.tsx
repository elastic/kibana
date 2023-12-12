/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/css';

import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { PanelNavItem } from './panel_nav_item';

const accordionButtonClassName = 'sideNavPanelAccordion__button';

const getClassnames = (euiTheme: EuiThemeComputed<{}>) => ({
  title: css`
    text-transform: uppercase;
    color: ${euiTheme.colors.darkShade};
    padding-left: ${euiTheme.size.s};
    padding-bottom: ${euiTheme.size.s};
    ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xxs')}
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
  /** Flag to indicate if the group is the first in the list of groups when looping */
  isFirstInList?: boolean;
  /** Flag to indicate if an horizontal rule preceeds this group */
  hasHorizontalRuleBefore?: boolean;
}

export const PanelGroup: FC<Props> = ({ navNode, isFirstInList, hasHorizontalRuleBefore }) => {
  const { euiTheme } = useEuiTheme();
  const { id, title, appendHorizontalRule, spaceBefore: _spaceBefore } = navNode;
  const filteredChildren = navNode.children?.filter((child) => child.sideNavStatus !== 'hidden');
  const classNames = getClassnames(euiTheme);
  const hasTitle = !!title && title !== '';
  const removePaddingTop = !hasTitle && !isFirstInList;
  const someChildIsGroup = filteredChildren?.some((child) => !!child.children);
  const firstChildIsGroup = !!filteredChildren?.[0]?.children;
  const groupTestSubj = `panelGroup panelGroupId-${navNode.id}`;

  let spaceBefore = _spaceBefore;
  if (spaceBefore === undefined) {
    if (!hasTitle && isFirstInList) {
      // If the first group has no title, we don't add any space.
      spaceBefore = null;
    } else {
      spaceBefore = hasHorizontalRuleBefore ? 'm' : 'l';
    }
  }

  const renderChildren = useCallback(() => {
    if (!filteredChildren) return null;

    return filteredChildren.map((item, i) => {
      const isItem = item.renderAs === 'item' || !item.children;
      return isItem ? (
        <PanelNavItem key={item.id} item={item} />
      ) : (
        <PanelGroup navNode={item} key={item.id} />
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
          buttonContent={title}
          className={classNames.accordion}
          buttonClassName={accordionButtonClassName}
          data-test-subj={groupTestSubj}
          buttonProps={{
            'data-test-subj': `panelAccordionBtnId-${navNode.id}`,
          }}
        >
          <>
            {!firstChildIsGroup && <EuiSpacer size="s" />}
            {renderChildren()}
          </>
        </EuiAccordion>
        {appendHorizontalRule && <EuiHorizontalRule margin="xs" />}
      </>
    );
  }

  return (
    <div data-test-subj={groupTestSubj}>
      {spaceBefore !== null && <EuiSpacer size={spaceBefore} />}
      {hasTitle && (
        <EuiTitle
          size="xxxs"
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
          marginTop:
            hasHorizontalRuleBefore && !hasTitle ? `calc(${euiTheme.size.s} * -1)` : undefined,
          // Remove the gap between groups if some items are groups
          gap: someChildIsGroup ? 0 : undefined,
        }}
      >
        {renderChildren()}
      </EuiListGroup>
      {appendHorizontalRule && <EuiHorizontalRule margin="xs" />}
    </div>
  );
};
