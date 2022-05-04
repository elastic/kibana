/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav.scss';

import React, { FunctionComponent, useState, useMemo } from 'react';

import {
  EuiAvatarProps,
  EuiCollapsibleNavGroup,
  EuiFlyout,
  EuiSideNav,
  EuiSideNavItemType,
  EuiSideNavProps,
  EuiSpacer,
  EuiTitle,
  htmlIdGenerator,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import classNames from 'classnames';
import { KibanaSolutionAvatar } from '../../solution_avatar';
import { KibanaPageTemplateSolutionNavCollapseButton } from './solution_nav_collapse_button';

export type KibanaPageTemplateSolutionNavProps = Omit<
  EuiSideNavProps<{}>,
  'children' | 'items' | 'heading'
> & {
  /**
   * Name of the solution, i.e. "Observability"
   */
  name: EuiAvatarProps['name'];
  /**
   * Solution logo, i.e. "logoObservability"
   */
  icon?: EuiAvatarProps['iconType'];
  /**
   *  An array of #EuiSideNavItem objects. Lists navigation menu items.
   */
  items?: EuiSideNavProps<{}>['items'];
  /**
   *  Render children instead of default EuiSideNav
   */
  children?: React.ReactNode;
  /**
   * Control the collapsed state
   */
  isOpenOnDesktop?: boolean;
  onCollapse?: () => void;
};

const FLYOUT_SIZE = 248;

const setTabIndex = (items: Array<EuiSideNavItemType<{}>>, isHidden: boolean) => {
  return items.map((item) => {
    // @ts-ignore-next-line Can be removed on close of https://github.com/elastic/eui/issues/4925
    item.tabIndex = isHidden ? -1 : undefined;
    item.items = item.items && setTabIndex(item.items, isHidden);
    return item;
  });
};

const generateId = htmlIdGenerator('KibanaPageTemplateSolutionNav');

/**
 * A wrapper around EuiSideNav but also creates the appropriate title with optional solution logo
 */
export const KibanaPageTemplateSolutionNav: FunctionComponent<
  KibanaPageTemplateSolutionNavProps
> = ({
  children,
  headingProps,
  icon,
  isOpenOnDesktop = false,
  items,
  mobileBreakpoints = ['xs', 's'],
  name,
  onCollapse,
  ...rest
}) => {
  const isSmallerBreakpoint = useIsWithinBreakpoints(mobileBreakpoints);
  const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
  const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);

  // This is used for both the EuiSideNav and EuiFlyout toggling
  const [isSideNavOpenOnMobile, setIsSideNavOpenOnMobile] = useState(false);
  const toggleOpenOnMobile = () => {
    setIsSideNavOpenOnMobile(!isSideNavOpenOnMobile);
  };

  const isHidden = isLargerBreakpoint && !isOpenOnDesktop;
  const isCustomSideNav = !!children;

  const sideNavClasses = classNames('kbnPageTemplateSolutionNav', {
    'kbnPageTemplateSolutionNav--hidden': isHidden,
  });

  /**
   * Create the avatar
   */
  const solutionAvatar = useMemo(() => {
    if (!icon) {
      return;
    }
    return (
      <KibanaSolutionAvatar
        className="kbnPageTemplateSolutionNav__avatar"
        iconType={icon}
        name={name}
      />
    );
  }, [name, icon]);

  /**
   * Create the titles
   */
  const headingID = headingProps?.id || generateId('heading');
  const HeadingElement = headingProps?.element || 'h2';
  const titleText = useMemo(
    () => (
      <EuiTitle size="xs" id={headingID}>
        <HeadingElement>
          {solutionAvatar}
          <strong>{name}</strong>
        </HeadingElement>
      </EuiTitle>
    ),
    [name, solutionAvatar, headingID, HeadingElement]
  );

  /**
   * Create the side nav content
   */
  const sideNavContent = useMemo(() => {
    if (isCustomSideNav) {
      return children;
    }
    if (!items) {
      return null;
    }
    return (
      <EuiSideNav
        aria-labelledby={headingID}
        aria-hidden={isHidden}
        items={setTabIndex(items, isHidden)}
        mobileBreakpoints={[]} // prevent EuiSideNav to apply mobile version, already implemented here
        {...rest}
      />
    );
  }, [children, headingID, isCustomSideNav, isHidden, items, rest]);

  return (
    <>
      {isSmallerBreakpoint && (
        <EuiCollapsibleNavGroup
          className={sideNavClasses}
          paddingSize="m"
          background="none"
          title={titleText}
          titleElement="span"
          isCollapsible={true}
          initialIsOpen={false}
          iconType="apps"
        >
          {sideNavContent}
        </EuiCollapsibleNavGroup>
      )}
      {isMediumBreakpoint && (
        <>
          {isSideNavOpenOnMobile && (
            <EuiFlyout
              ownFocus={false}
              outsideClickCloses
              onClose={() => setIsSideNavOpenOnMobile(false)}
              side="left"
              size={FLYOUT_SIZE}
              closeButtonPosition={isCustomSideNav ? 'inside' : 'outside'}
              className="kbnPageTemplateSolutionNav__flyout"
            >
              <div className={sideNavClasses}>
                {titleText}
                <EuiSpacer size="l" />
                {sideNavContent}
              </div>
            </EuiFlyout>
          )}
          <KibanaPageTemplateSolutionNavCollapseButton
            isCollapsed={true}
            onClick={toggleOpenOnMobile}
          />
        </>
      )}
      {isLargerBreakpoint && (
        <>
          <div className={sideNavClasses}>
            {titleText}
            <EuiSpacer size="l" />
            {sideNavContent}
          </div>
          <KibanaPageTemplateSolutionNavCollapseButton
            isCollapsed={!isOpenOnDesktop}
            onClick={onCollapse}
          />
        </>
      )}
    </>
  );
};
