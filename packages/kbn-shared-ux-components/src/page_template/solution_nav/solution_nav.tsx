/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './solution_nav.scss';

import React, { FunctionComponent, useState, useMemo } from 'react';
import classNames from 'classnames';
import {
  EuiAvatarProps,
  EuiCollapsibleNavGroup,
  EuiFlyout,
  EuiFlyoutProps,
  EuiPanel,
  EuiSideNav,
  EuiSideNavItemType,
  EuiSideNavProps,
  EuiSpacer,
  EuiTitle,
  htmlIdGenerator,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';

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
   *  Renders the children instead of default EuiSideNav
   */
  children?: React.ReactNode;
  /**
   * The position of the close button when the navigation flyout is open.
   * Note that side navigation turns into a flyout only when the screen has medium size.
   */
  closeFlyoutButtonPosition?: EuiFlyoutProps['closeButtonPosition'];
  /**
   * Control the collapsed state
   */
  isOpenOnDesktop?: boolean;
  onCollapse?: () => void;
  /**
   * Allows hiding of the navigation by the user.
   * If false, forces all breakpoint versions into the open state without the ability to hide.
   */
  canBeCollapsed?: boolean;
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
  closeFlyoutButtonPosition = 'outside',
  name,
  onCollapse,
  canBeCollapsed = true,
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

  const isHidden = isLargerBreakpoint && !isOpenOnDesktop && canBeCollapsed;
  const isCustomSideNav = !!children;

  const sideNavClasses = classNames('kbnPageTemplateSolutionNav', {
    'kbnPageTemplateSolutionNav--hidden': isHidden,
  });

  /**
   * Create the avatar and titles
   */
  const headingID = headingProps?.id || generateId('heading');
  const HeadingElement = headingProps?.element || 'h2';
  const titleText = (
    <EuiTitle size="xs" id={headingID}>
      <HeadingElement>
        {icon && (
          <KibanaSolutionAvatar
            className="kbnPageTemplateSolutionNav__avatar"
            iconType={icon}
            name={name}
          />
        )}
        <strong>
          <FormattedMessage
            id="sharedUXComponents.solutionNav.mobileTitleText"
            defaultMessage="{solutionName} {menuText}"
            values={{
              solutionName: name || 'Navigation',
              menuText: isSmallerBreakpoint
                ? i18n.translate('sharedUXComponents.solutionNav.menuText', {
                    defaultMessage: 'menu',
                  })
                : '',
            }}
          />
        </strong>
      </HeadingElement>
    </EuiTitle>
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
        // @ts-expect-error Mismatch in collapsible vs unconllapsible props
        <EuiCollapsibleNavGroup
          className={sideNavClasses}
          paddingSize="none"
          background="none"
          title={titleText}
          titleElement="span"
          isCollapsible={canBeCollapsed}
          initialIsOpen={false}
        >
          <EuiPanel color="transparent" paddingSize="s">
            {sideNavContent}
          </EuiPanel>
        </EuiCollapsibleNavGroup>
      )}
      {isMediumBreakpoint && (
        <>
          {(isSideNavOpenOnMobile || !canBeCollapsed) && (
            <EuiFlyout
              ownFocus={false}
              outsideClickCloses
              onClose={() => setIsSideNavOpenOnMobile(false)}
              side="left"
              size={FLYOUT_SIZE}
              closeButtonPosition={closeFlyoutButtonPosition}
              className="kbnPageTemplateSolutionNav__flyout"
              hideCloseButton={!canBeCollapsed}
            >
              <div className={sideNavClasses}>
                {titleText}
                <EuiSpacer size="l" />
                {sideNavContent}
              </div>
            </EuiFlyout>
          )}
          {canBeCollapsed && (
            <KibanaPageTemplateSolutionNavCollapseButton
              isCollapsed={true}
              onClick={toggleOpenOnMobile}
            />
          )}
        </>
      )}
      {isLargerBreakpoint && (
        <>
          <div className={sideNavClasses}>
            {titleText}
            <EuiSpacer size="l" />
            {sideNavContent}
          </div>
          {canBeCollapsed && (
            <KibanaPageTemplateSolutionNavCollapseButton
              isCollapsed={!isOpenOnDesktop}
              onClick={onCollapse}
            />
          )}
        </>
      )}
    </>
  );
};
