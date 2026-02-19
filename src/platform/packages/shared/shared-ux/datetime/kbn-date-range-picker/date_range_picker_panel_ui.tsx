/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode, PropsWithChildren, ButtonHTMLAttributes, MouseEventHandler } from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';

import { useDateRangePickerPanelNavigation } from './date_range_picker_panel_navigation';
import {
  panelContainerStyles,
  panelHeaderStyles,
  subPanelHeadingStyles,
  panelBodyStyles,
  panelBodySectionStyles,
  panelListItemStyles,
  panelNavItemStyles,
  panelFooterStyles,
  panelSpacingStyles,
} from './date_range_picker_panel_ui.styles';

interface PanelCommonProps {
  /** @default both */
  spacingSide?: 'block' | 'inline' | 'both' | 'none';
}

/**
 * Flex column container for a panel inside the date range picker dialog.
 * Expected children: `PanelHeader` (optional), `PanelBody`, and `PanelFooter`.
 */
export const PanelContainer = ({ children }: PropsWithChildren) => {
  const euiThemeContext = useEuiTheme();

  return <div css={panelContainerStyles(euiThemeContext).root}>{children}</div>;
};

/** Header section at the top of a panel. */
export const PanelHeader = ({
  spacingSide = 'none',
  children,
}: PanelCommonProps & PropsWithChildren) => {
  const euiThemeContext = useEuiTheme();
  const styles = panelHeaderStyles(euiThemeContext);
  const spacing = panelSpacingStyles(euiThemeContext);

  return <div css={[styles.root, spacing[spacingSide]]}>{children}</div>;
};

/** Heading used inside `PanelHeader` for sub-panels (panels navigated to from the main panel). */
export const SubPanelHeading = ({ children }: PropsWithChildren) => {
  const { goBack, canGoBack } = useDateRangePickerPanelNavigation();
  const euiThemeContext = useEuiTheme();
  const styles = subPanelHeadingStyles(euiThemeContext);

  if (canGoBack) {
    return (
      <button css={[styles.root, styles.button]} onClick={goBack}>
        <EuiIcon type="sortLeft" />
        <>{children}</>
      </button>
    );
  }

  return <h2 css={[styles.root]}>{children}</h2>;
};

/**
 * Scrollable body section of a panel. Sits between `PanelHeader` and `PanelFooter`.
 * Will fill the vertical space (flew-grow: 1), and can scroll.
 */
export const PanelBody = ({ children }: PropsWithChildren) => {
  const euiThemeContext = useEuiTheme();

  return <div css={panelBodyStyles(euiThemeContext).root}>{children}</div>;
};

/** A logical section within `PanelBody` for grouping related content. */
export const PanelBodySection = ({
  spacingSide = 'both',
  children,
}: PanelCommonProps & PropsWithChildren) => {
  const euiThemeContext = useEuiTheme();
  const styles = panelBodySectionStyles(euiThemeContext);
  const spacing = panelSpacingStyles(euiThemeContext);

  return <div css={[styles.root, spacing[spacingSide]]}>{children}</div>;
};

interface PanelListItemProps {
  /** Main action handler, merged with buttonProps when present */
  onClick: MouseEventHandler<HTMLButtonElement>;
  /** Additional props for the main button */
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;
  /** Meta text on the right hand side */
  suffix?: string;
  /** Extra actions shown only on container hover */
  extraActions?: ReactNode;
}

/** A single selectable item within the panel body. */
export const PanelListItem = ({
  onClick,
  buttonProps,
  suffix,
  extraActions,
  children,
}: PanelListItemProps & PropsWithChildren) => {
  const euiThemeContext = useEuiTheme();
  const styles = panelListItemStyles(euiThemeContext);

  return (
    <li css={styles.root}>
      <button css={styles.button} {...buttonProps} onClick={onClick}>
        {children}
        {suffix && <span css={styles.suffix}>{suffix}</span>}
      </button>
      {extraActions && <div css={styles.extraActions}>{extraActions}</div>}
    </li>
  );
};

interface PanelNavItemProps {
  /** Main action handler, merged with buttonProps when present */
  onClick: MouseEventHandler<HTMLButtonElement>;
  /** Additional props for the main button */
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;
  /** Duh */
  icon?: IconType;
}

/** A navigation item within the panel body that links to another panel. */
export const PanelNavItem = ({
  onClick,
  buttonProps,
  icon,
  children,
}: PanelNavItemProps & PropsWithChildren) => {
  const euiThemeContext = useEuiTheme();
  const styles = panelNavItemStyles(euiThemeContext);

  return (
    <li css={styles.root}>
      <button css={styles.button} {...buttonProps} onClick={onClick}>
        <span css={styles.label}>
          {icon && <EuiIcon type={icon} size="m" />}
          {children}
        </span>
        <EuiIcon type="arrowRight" size="m" color="subdued" />
      </button>
    </li>
  );
};

interface PanelBodySectionProps {
  primaryAction?: ReactNode;
}

/** Footer section pinned to the bottom of a panel. */
export const PanelFooter = ({
  primaryAction,
  children,
}: PanelBodySectionProps & PropsWithChildren) => {
  const euiThemeContext = useEuiTheme();
  const styles = panelFooterStyles(euiThemeContext);

  return (
    <div css={styles.root}>
      <div css={styles.content}>{children}</div>
      {primaryAction && <div css={styles.primaryAction}>{primaryAction}</div>}
    </div>
  );
};
