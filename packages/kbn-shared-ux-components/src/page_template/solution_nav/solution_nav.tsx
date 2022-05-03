/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav.scss';

import React, { FunctionComponent, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiAvatarProps,
  EuiBreakpointSize,
  EuiButtonEmpty,
  EuiFlyout,
  EuiHideFor,
  EuiScreenReaderOnly,
  EuiShowFor,
  EuiSideNav,
  EuiSideNavItemType,
  EuiSideNavProps,
  EuiTitle,
  htmlIdGenerator,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import classNames from 'classnames';
import { KibanaSolutionAvatar } from '../../solution_avatar';
import { KibanaPageTemplateSolutionNavCollapseButton } from './solution_nav_collapse_button';

export type KibanaPageTemplateSolutionNavProps = Omit<EuiSideNavProps<{}>, 'children' | 'items'> & {
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
    const sideNavClasses = classNames({
      'kbnPageTemplateSolutionNav--hidden': isHidden,
    });
    return (
      <EuiSideNav
        aria-hidden={isHidden}
        className={sideNavClasses}
        items={setTabIndex(items, isHidden)}
        mobileBreakpoints={[]} // prevent EuiSideNav to apply mobile version, already implemented here
        {...rest}
      />
    );
  }, [children, isCustomSideNav, isHidden, items, rest]);

  /**
   * Create the avatar
   */
  const solutionAvatar = icon ? (
    <KibanaSolutionAvatar
      className="kbnPageTemplateSolutionNavAvatar"
      iconType={icon}
      name={name}
    />
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

  const mobileTitle = (
    <>
      {solutionAvatar}
      <FormattedMessage
        id="sharedUXComponents.solutionNav.mobileTitleText"
        defaultMessage="{solutionName} Menu"
        values={{ solutionName: name || 'Navigation' }}
      />
    </>
  );

  // To support the extra CSS needed to show/hide/animate the content,
  // We add a className for every breakpoint supported
  const contentClasses = classNames(
    'euiSideNav__content',
    mobileBreakpoints?.map((breakpointName) => `euiSideNav__contentMobile-${breakpointName}`)
  );
  const sideNavContentId = generateId('content');
  const navContent = (
    <div id={sideNavContentId} className={contentClasses}>
      {sideNavContent}
    </div>
  );

  const {
    screenReaderOnly: headingScreenReaderOnly = false,
    element: HeadingElement = 'h2',
    ...titleProps
  } = headingProps ?? {};

  const hasMobileVersion = mobileBreakpoints && mobileBreakpoints.length > 0;
  const hasHeader = !!titleText;

  const sharedHeadingProps = {
    id: headingProps?.id || generateId('heading'),
    className: headingProps?.className,
    'data-test-subj': headingProps?.['data-test-subj'],
    'aria-label': headingProps?.['aria-label'],
  };

  let headingNode;
  if (hasHeader) {
    headingNode = <HeadingElement {...sharedHeadingProps}>{titleText}</HeadingElement>;

    if (headingScreenReaderOnly) {
      headingNode = <EuiScreenReaderOnly>{headingNode}</EuiScreenReaderOnly>;
    } else {
      headingNode = (
        <EuiTitle
          size="xs"
          {...titleProps}
          className={classNames('euiSideNav__heading', headingProps?.className)}
        >
          <HeadingElement {...sharedHeadingProps}>{titleText}</HeadingElement>
        </EuiTitle>
      );
    }
  }

  const breakpoints: EuiBreakpointSize[] | undefined = mobileBreakpoints;
  const navClasses = classNames('euiSideNav', 'kbnPageTemplateSolutionNav', {
    'euiSideNav-isOpenMobile': isSideNavOpenOnMobile,
  });

  let mobileNode;
  if (hasMobileVersion) {
    mobileNode = (
      <EuiShowFor sizes={breakpoints || 'none'}>
        <nav aria-labelledby={sharedHeadingProps.id} className={navClasses} {...rest}>
          <HeadingElement {...sharedHeadingProps}>
            <EuiButtonEmpty
              className="euiSideNav__mobileToggle"
              textProps={{ className: 'euiSideNav__mobileToggleText' }}
              contentProps={{
                className: 'euiSideNav__mobileToggleContent',
              }}
              onClick={toggleOpenOnMobile}
              iconType="apps"
              iconSide="right"
              aria-controls={sideNavContentId}
              aria-expanded={isSideNavOpenOnMobile}
            >
              {mobileTitle || titleText}
            </EuiButtonEmpty>
          </HeadingElement>
          {navContent}
        </nav>
      </EuiShowFor>
    );
  }

  const sideNavNode = (
    <>
      {mobileNode}
      <EuiHideFor sizes={isHidden ? 'all' : breakpoints || 'none'}>
        <nav
          aria-labelledby={headingNode ? sharedHeadingProps.id : undefined}
          className={navClasses}
          {...rest}
        >
          {headingNode}
          {navContent}
        </nav>
      </EuiHideFor>
    </>
  );

  return (
    <>
      {isSmallerBreakpoint && sideNavNode}
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
              {sideNavNode}
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
          {sideNavNode}
          <KibanaPageTemplateSolutionNavCollapseButton
            isCollapsed={!isOpenOnDesktop}
            onClick={onCollapse}
          />
        </>
      )}
    </>
  );
};
