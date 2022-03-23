/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav.scss';

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlyout,
  EuiSideNav,
  EuiSideNavItemType,
  EuiSideNavProps,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import classNames from 'classnames';
import {
  KibanaPageTemplateSolutionNavAvatar,
  KibanaPageTemplateSolutionNavAvatarProps,
} from '../solution_nav_avatar';
import { KibanaPageTemplateSolutionNavCollapseButton } from './solution_nav_collapse_button';

export type KibanaPageTemplateSolutionNavProps = EuiSideNavProps<{}> & {
  /**
   * Name of the solution, i.e. "Observability"
   */
  name: KibanaPageTemplateSolutionNavAvatarProps['name'];
  /**
   * Solution logo, i.e. "logoObservability"
   */
  icon?: KibanaPageTemplateSolutionNavAvatarProps['iconType'];
  /**
   * Control the collapsed state
   */
  isOpenOnDesktop?: boolean;
  onCollapse?: () => void;
};

const SIZE = 248;

const setTabIndex = (items: Array<EuiSideNavItemType<{}>>, isHidden: boolean) => {
  return items.map((item) => {
    // @ts-ignore-next-line Can be removed on close of https://github.com/elastic/eui/issues/4925
    item.tabIndex = isHidden ? -1 : undefined;
    item.items = item.items && setTabIndex(item.items, isHidden);
    return item;
  });
};

/**
 * A wrapper around EuiSideNav but also creates the appropriate title with optional solution logo
 */
export const KibanaPageTemplateSolutionNav = ({
  name,
  icon,
  items,
  isOpenOnDesktop = true,
  onCollapse,
  ...rest
}: KibanaPageTemplateSolutionNavProps) => {
  const isSmallerBreakpoint = useIsWithinBreakpoints(['xs', 's']);
  const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
  const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);

  // This is used for both the EuiSideNav and EuiFlyout toggling
  const [isSideNavOpenOnMobile, setIsSideNavOpenOnMobile] = useState(false);
  const toggleOpenOnMobile = () => {
    setIsSideNavOpenOnMobile(!isSideNavOpenOnMobile);
  };

  const isHidden = isLargerBreakpoint && !isOpenOnDesktop;

  /**
   * Create the avatar
   */
  const solutionAvatar = icon ? (
    <KibanaPageTemplateSolutionNavAvatar iconType={icon} name={name} />
  ) : null;

  /**
   * Create the titles
   */
  const titleText = (
    <>
      {solutionAvatar}
      <strong>{name}</strong>
    </>
  );
  const mobileTitleText = (
    <FormattedMessage
      id="sharedUXComponents.solutionNav.mobileTitleText"
      defaultMessage="{solutionName} Menu"
      values={{ solutionName: name || 'Navigation' }}
    />
  );

  /**
   * Create the side nav component
   */

  const sideNav = () => {
    const sideNavClasses = classNames('kbnPageTemplateSolutionNav', {
      'kbnPageTemplateSolutionNav--hidden': isHidden,
    });
    if (!items) {
      return null;
    }
    return (
      <EuiSideNav
        aria-hidden={isHidden}
        className={sideNavClasses}
        heading={titleText}
        mobileTitle={
          <>
            {solutionAvatar}
            {mobileTitleText}
          </>
        }
        toggleOpenOnMobile={toggleOpenOnMobile}
        isOpenOnMobile={isSideNavOpenOnMobile}
        items={setTabIndex(items, isHidden)}
        {...rest}
      />
    );
  };

  return (
    <>
      {isSmallerBreakpoint && sideNav()}
      {isMediumBreakpoint && (
        <>
          {isSideNavOpenOnMobile && (
            <EuiFlyout
              ownFocus={false}
              outsideClickCloses
              onClose={() => setIsSideNavOpenOnMobile(false)}
              side="left"
              size={SIZE}
              closeButtonPosition="outside"
              className="kbnPageTemplateSolutionNav__flyout"
            >
              {sideNav()}
            </EuiFlyout>
          )}
          <KibanaPageTemplateSolutionNavCollapseButton
            collapsed={true}
            onClick={toggleOpenOnMobile}
          />
        </>
      )}
      {isLargerBreakpoint && (
        <>
          {sideNav()}
          <KibanaPageTemplateSolutionNavCollapseButton
            collapsed={!isOpenOnDesktop}
            onClick={onCollapse}
          />
        </>
      )}
    </>
  );
};
