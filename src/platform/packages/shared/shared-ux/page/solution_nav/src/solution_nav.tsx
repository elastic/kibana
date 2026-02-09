/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import classNames from 'classnames';
import type { FC } from 'react';
import React, { useState, useMemo, useEffect } from 'react';

import type {
  EuiAvatarProps,
  EuiFlyoutProps,
  EuiSideNavItemType,
  EuiSideNavProps,
} from '@elastic/eui';
import {
  EuiCollapsibleNavGroup,
  EuiFlyout,
  EuiPanel,
  EuiSideNav,
  EuiSpacer,
  EuiTitle,
  htmlIdGenerator,
  useIsWithinBreakpoints,
  useIsWithinMinBreakpoint,
  useEuiTheme,
  useEuiThemeCSSVariables,
  EuiPageSidebar,
  useEuiOverflowScroll,
  useEuiMinBreakpoint,
  euiCanAnimate,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';

import { SolutionNavCollapseButton } from './collapse_button';

/**
 * Props for the `SolutionNav` component.
 */
export type SolutionNavProps = Omit<EuiSideNavProps<{}>, 'children' | 'items' | 'heading'> & {
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
  /**
   * Handler for when the navigation flyout is collapsed.
   */
  onCollapse?: () => void;
  /**
   * Allows hiding of the navigation by the user.
   * If false, forces all breakpoint versions into the open state without the ability to hide.
   */
  canBeCollapsed?: boolean;
};

const FLYOUT_SIZE = 248;
const FLYOUT_SIZE_CSS = `${FLYOUT_SIZE}px`;

const setTabIndex = (items: Array<EuiSideNavItemType<{}>>, isHidden: boolean) => {
  return items.map((item) => {
    // @ts-ignore-next-line Can be removed on close of https://github.com/elastic/eui/issues/4925
    item.tabIndex = isHidden ? -1 : undefined;
    item.items = item.items && setTabIndex(item.items, isHidden);
    return item;
  });
};

const generateId = htmlIdGenerator('SolutionNav');

/**
 * A wrapper around `EuiSideNav` that includes the appropriate title with optional solution logo.
 */
export const SolutionNav: FC<SolutionNavProps> = ({
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
  const { euiTheme } = useEuiTheme();
  const isSmallerBreakpoint = useIsWithinBreakpoints(mobileBreakpoints);
  const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
  const isLargerBreakpoint = useIsWithinMinBreakpoint('l');

  // This is used for both the `EuiSideNav` and `EuiFlyout` toggling
  const [isSideNavOpenOnMobile, setIsSideNavOpenOnMobile] = useState(false);
  const toggleOpenOnMobile = () => {
    setIsSideNavOpenOnMobile(!isSideNavOpenOnMobile);
  };

  const isHidden = isLargerBreakpoint && !isOpenOnDesktop && canBeCollapsed;
  const isCustomSideNav = !!children;

  const sideNavClasses = classNames('kbnSolutionNav', {
    'kbnSolutionNav--hidden': isHidden,
  });

  // Create the avatar and titles.
  const headingID = headingProps?.id || generateId('heading');
  const HeadingElement = headingProps?.element || 'h2';

  const titleText = (
    <EuiTitle
      size="xs"
      id={headingID}
      data-test-subj={headingProps?.['data-test-subj']}
      css={css`
        display: inline-flex;
        align-items: center;
      `}
    >
      <HeadingElement>
        {icon && (
          <KibanaSolutionAvatar
            css={css`
              margin-right: ${euiTheme.size.m};
              align-self: flex-start;
            `}
            iconType={icon}
            name={name}
          />
        )}
        <strong>
          <FormattedMessage
            id="sharedUXPackages.solutionNav.mobileTitleText"
            defaultMessage="{solutionName} {menuText}"
            values={{
              solutionName: name || 'Navigation',
              menuText: isSmallerBreakpoint
                ? i18n.translate('sharedUXPackages.solutionNav.menuText', {
                    defaultMessage: 'menu',
                  })
                : '',
            }}
          />
        </strong>
      </HeadingElement>
    </EuiTitle>
  );

  // Create the side nav content
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

  const navWidth = useMemo(() => {
    if (isLargerBreakpoint) {
      return isOpenOnDesktop ? FLYOUT_SIZE_CSS : euiTheme.size.xxl;
    }
    if (isMediumBreakpoint) {
      return isSideNavOpenOnMobile || !canBeCollapsed ? FLYOUT_SIZE_CSS : euiTheme.size.xxl;
    }
    return '0';
  }, [
    euiTheme,
    isOpenOnDesktop,
    isSideNavOpenOnMobile,
    canBeCollapsed,
    isMediumBreakpoint,
    isLargerBreakpoint,
  ]);
  const { setGlobalCSSVariables } = useEuiThemeCSSVariables();
  // Setting a global CSS variable with the nav width
  // so that other pages have it available when needed.
  useEffect(() => {
    setGlobalCSSVariables({
      '--kbnSolutionNavOffset': navWidth,
    });
  }, [navWidth, setGlobalCSSVariables]);

  const styles = {
    solutionNav: css`
      display: flex;
      flex-direction: column;

      ${useEuiOverflowScroll('y')};

      ${useEuiMinBreakpoint('m')} {
        width: ${FLYOUT_SIZE_CSS};
        padding: ${euiTheme.size.l};
      }
    `,
    solutionNavHidden: css`
      pointer-events: none;
      opacity: 0;

      ${euiCanAnimate} {
        transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
      }
    `,
  };
  return (
    <>
      {isSmallerBreakpoint && (
        // @ts-expect-error Mismatch in collapsible vs unconllapsible props
        <EuiCollapsibleNavGroup
          className={sideNavClasses}
          css={[styles.solutionNav, isHidden && styles.solutionNavHidden]}
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
              css={css`
                // Put the page background color in the flyout version too
                background-color: ${euiTheme.colors.backgroundBasePlain};

                .kbnSolutionNav {
                  flex: auto; // Override default EuiPageSideBar flex CSS when in a flyout
                }
              `}
              hideCloseButton={!canBeCollapsed}
              session="never"
            >
              <EuiPageSidebar
                className={sideNavClasses}
                css={[styles.solutionNav, isHidden && styles.solutionNavHidden]}
                hasEmbellish={true}
              >
                {titleText}
                <EuiSpacer size="l" />
                {sideNavContent}
              </EuiPageSidebar>
            </EuiFlyout>
          )}
          {canBeCollapsed && (
            <SolutionNavCollapseButton isCollapsed={true} onClick={toggleOpenOnMobile} />
          )}
        </>
      )}
      {isLargerBreakpoint && (
        <>
          <div
            css={[styles.solutionNav, isHidden && styles.solutionNavHidden]}
            className={sideNavClasses}
          >
            {titleText}
            <EuiSpacer size="l" />
            {sideNavContent}
          </div>
          {canBeCollapsed && (
            <SolutionNavCollapseButton isCollapsed={!isOpenOnDesktop} onClick={onCollapse} />
          )}
        </>
      )}
    </>
  );
};
