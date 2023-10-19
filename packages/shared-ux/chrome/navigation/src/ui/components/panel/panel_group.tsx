/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, Fragment, useCallback } from 'react';
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

import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
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

interface Props {
  navNode: ChromeProjectNavigationNode;
  /** Flag to indicate if the group is the first in the list of groups when looping */
  isFirstInList?: boolean;
  /** Flag to indicate if an horizontal rule preceeds this group */
  hasHorizontalRuleBefore?: boolean;
}

export const PanelGroup: FC<Props> = ({ navNode, isFirstInList, hasHorizontalRuleBefore }) => {
  const { euiTheme } = useEuiTheme();
  const { id, title, appendHorizontalRule } = navNode;
  const filteredChildren = navNode.children?.filter((child) => child.sideNavStatus !== 'hidden');
  const totalChildren = filteredChildren?.length ?? 0;
  const classNames = getClassnames(euiTheme);
  const hasTitle = !!title && title !== '';
  const removePaddingTop = !hasTitle && !isFirstInList;
  const someChildIsGroup = filteredChildren?.some((child) => !!child.children);
  const firstChildIsGroup = !!filteredChildren?.[0]?.children;

  const renderChildren = useCallback(() => {
    if (!filteredChildren) return null;

    return filteredChildren.map((item, i) => {
      const isItem = item.renderAs === 'item' || !item.children;
      return isItem ? (
        <PanelNavItem key={item.id} item={item} />
      ) : (
        <Fragment key={item.id}>
          <PanelGroup navNode={item} />
          {i < totalChildren - 1 && <EuiSpacer />}
        </Fragment>
      );
    });
  }, [filteredChildren, totalChildren]);

  if (!filteredChildren?.length) {
    return null;
  }

  if (navNode.renderAs === 'accordion') {
    return (
      <>
        <EuiAccordion
          id={id}
          buttonContent={title}
          className={classNames.accordion}
          buttonClassName={accordionButtonClassName}
        >
          <>
            <EuiSpacer size={firstChildIsGroup ? 'l' : 's'} />
            {renderChildren()}
          </>
        </EuiAccordion>
        {appendHorizontalRule && <EuiHorizontalRule margin="xs" />}
      </>
    );
  }

  return (
    <>
      {hasTitle && (
        <EuiTitle size="xxxs" className={classNames.title}>
          <h2>{navNode.title}</h2>
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
    </>
  );
};
