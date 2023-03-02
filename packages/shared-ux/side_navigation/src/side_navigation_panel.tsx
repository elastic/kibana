/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useCallback } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiHorizontalRule,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
  EuiWindowEvent,
  keys,
  useEuiTheme,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import classNames from 'classnames';
import { METRIC_TYPE } from '@kbn/analytics';
import type { DefaultSideNavItem, LinkCategories } from './types';
import { BetaBadge } from './beta_badge';
import { TELEMETRY_EVENT } from './telemetry/const';
import { useTelemetryContext } from './telemetry/telemetry_context';
import { SideNavPanelStyles, panelClass, SideNavTitleStyles } from './side_navigation_panel.styles';

export interface SideNavigationPanelProps {
  onClose: () => void;
  onOutsideClick: () => void;
  title: string;
  items: DefaultSideNavItem[];
  categories?: LinkCategories;
  bottomOffset?: string;
}
export interface SideNavigationPanelCategoriesProps {
  categories: LinkCategories;
  items: DefaultSideNavItem[];
  onClose: () => void;
}
export interface SideNavigationPanelItemsProps {
  items: DefaultSideNavItem[];
  onClose: () => void;
}

/**
 * Renders the side navigation panel for secondary links
 */
const SideNavigationPanelComponent: React.FC<SideNavigationPanelProps> = ({
  onClose,
  onOutsideClick,
  title,
  categories,
  items,
  bottomOffset,
}) => {
  const { euiTheme } = useEuiTheme();
  const isLargerBreakpoint = useIsWithinMinBreakpoint('l');

  // Only larger breakpoint needs to add bottom offset, other sizes should have full height
  const $bottomOffset = isLargerBreakpoint ? bottomOffset : undefined;
  const $topOffset = isLargerBreakpoint ? '48px' : undefined; // TODO: parametrize like bottomOffset
  const hasShadow = !$bottomOffset;

  const sideNavPanelStyles = SideNavPanelStyles(euiTheme, { $bottomOffset, $topOffset });
  const sideNavTitleStyles = SideNavTitleStyles(euiTheme, { $paddingTop: true });
  const panelClasses = classNames(panelClass, 'eui-yScroll', sideNavPanelStyles);
  const titleClasses = classNames(sideNavTitleStyles);

  // ESC key closes PanelNav
  const onKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === keys.ESCAPE) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <>
      {/* <GlobalPanelStyle /> */}
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiPortal>
        <EuiFocusTrap autoFocus>
          <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
            <EuiPanel
              className={panelClasses}
              hasShadow={hasShadow}
              // $bottomOffset={bottomOffsetLargerBreakpoint}
              borderRadius="none"
              paddingSize="m"
              data-test-subj="groupedNavPanel"
            >
              <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
                <EuiFlexItem>
                  <EuiTitle size="xs" className={titleClasses}>
                    <strong>{title}</strong>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiDescriptionList>
                    {categories ? (
                      <SideNavigationPanelCategories
                        categories={categories}
                        items={items}
                        onClose={onClose}
                      />
                    ) : (
                      <SideNavigationPanelItems items={items} onClose={onClose} />
                    )}
                  </EuiDescriptionList>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiOutsideClickDetector>
        </EuiFocusTrap>
      </EuiPortal>
    </>
  );
};
export const SideNavigationPanel = React.memo(SideNavigationPanelComponent);

const SideNavigationPanelCategories: React.FC<SideNavigationPanelCategoriesProps> = ({
  categories,
  items,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const sideNavTitleStyles = SideNavTitleStyles(euiTheme);
  const titleClasses = classNames(sideNavTitleStyles);

  const itemsMap = new Map(items.map((item) => [item.id, item]));

  return (
    <>
      {categories.map(({ label, linkIds }) => {
        const links = linkIds.reduce<DefaultSideNavItem[]>((acc, linkId) => {
          const link = itemsMap.get(linkId);
          if (link) {
            acc.push(link);
          }
          return acc;
        }, []);

        if (!links.length) {
          return null;
        }

        return (
          <Fragment key={label}>
            <EuiTitle size="xxxs" className={titleClasses}>
              <h2>{label}</h2>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
            <SideNavigationPanelItems items={links} onClose={onClose} />
            <EuiSpacer size="l" />
          </Fragment>
        );
      })}
    </>
  );
};

const SideNavigationPanelItems: React.FC<SideNavigationPanelItemsProps> = ({ items, onClose }) => {
  const panelLinkClassNames = classNames('solutionGroupedNavPanelLink');
  const panelLinkItemClassNames = classNames('solutionGroupedNavPanelLinkItem');
  const { tracker } = useTelemetryContext();
  return (
    <>
      {items.map(({ id, href, onClick, label, description, isBeta, betaOptions }) => (
        <a
          key={id}
          className={panelLinkClassNames}
          data-test-subj={`groupedNavPanelLink-${id}`}
          href={href}
          onClick={(ev) => {
            tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.GROUPED_NAVIGATION}${id}`);
            onClose();
            onClick?.(ev);
          }}
        >
          <EuiPanel hasShadow={false} className={panelLinkItemClassNames} paddingSize="s">
            <EuiDescriptionListTitle>
              {label}
              {isBeta && <BetaBadge text={betaOptions?.text} />}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
          </EuiPanel>
        </a>
      ))}
    </>
  );
};
