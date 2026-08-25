/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEventHandler, ReactNode } from 'react';
import type { EuiButtonProps, EuiFlyoutProps, EuiIconProps } from '@elastic/eui';

/** Props for the declarative `FlyoutTemplate.Header.Tab` part. */
export interface FlyoutHeaderTabProps {
  /** Stable identifier, used to link the tab to its `Body.TabPanel`. */
  id: string;
  /** Tab label rendered inside `EuiTab`. */
  label: ReactNode;
  disabled?: boolean;
  prepend?: ReactNode;
  append?: ReactNode;
  'data-test-subj'?: string;
}

/** Props for the declarative `FlyoutTemplate.Body.TabPanel` part. */
export interface FlyoutBodyTabPanelProps {
  /** Must match the `id` of a `Header.Tab`. */
  tabId: string;
  children?: ReactNode;
  'data-test-subj'?: string;
}

/** Props for the declarative `FlyoutTemplate.Header` zone. */
export interface FlyoutHeaderProps {
  /** Title rendered by the header. Rendered as an `<h3>` (heading level is owned by the template). */
  title: ReactNode;
  'data-test-subj'?: string;
  /** `Header.Tab` parts. Free-form content is not rendered. */
  children?: ReactNode;
  /** Icon beside the title; defaults to `info` when `titleTooltip` is set. */
  titleIcon?: EuiIconProps['type'];
  /** Tooltip shown from the title icon. */
  titleTooltip?: ReactNode;
  /** Subdued text below the title. */
  description?: ReactNode;
  /**
   * When true, the header is permanently rendered in its compact collapsed layout regardless of
   * scroll position, and the description is not shown.
   */
  collapsed?: boolean;
}

/** Props for the declarative `FlyoutTemplate.Body` zone. */
export interface FlyoutBodyProps {
  'data-test-subj'?: string;
  /** `Body.TabPanel` parts, and/or arbitrary content rendered as-is in source order. */
  children?: ReactNode;
}

/** Props shared by the declarative footer action parts. */
export interface FlyoutFooterActionBaseProps {
  /** HTML id forwarded to the button element. */
  id?: string;
  /** Button label. */
  label: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  iconType?: EuiButtonProps['iconType'];
  isLoading?: boolean;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

/** Props for the declarative `FlyoutTemplate.Footer.PrimaryAction` part. */
export type FlyoutFooterPrimaryActionProps = FlyoutFooterActionBaseProps;

/** Props for the declarative `FlyoutTemplate.Footer.SecondaryAction` part. */
export type FlyoutFooterSecondaryActionProps = FlyoutFooterActionBaseProps;

/** Props for the declarative `FlyoutTemplate.Footer` zone. */
export interface FlyoutFooterProps {
  'data-test-subj'?: string;
  /** `Footer.PrimaryAction` / `Footer.SecondaryAction` parts. */
  children?: ReactNode;
}

/** Props for the root `FlyoutTemplate` component. */
export type FlyoutTemplateProps = Pick<
  EuiFlyoutProps,
  | 'onClose'
  | 'size'
  | 'minWidth'
  | 'type'
  | 'maxWidth'
  | 'paddingSize'
  | 'ownFocus'
  | 'resizable'
  | 'onResize'
  | 'session'
  | 'historyKey'
  | 'onActive'
  | 'flyoutMenuProps'
  | 'id'
  | 'hasChildBackground'
  | 'outsideClickCloses'
  | 'focusTrapProps'
  | 'closeButtonProps'
> & {
  'aria-label'?: EuiFlyoutProps['aria-label'];
  'aria-labelledby'?: EuiFlyoutProps['aria-labelledby'];
  'data-test-subj'?: string;
  /** Declarative zone children: `FlyoutTemplate.Header`, `.Body`, `.Footer`. */
  children?: ReactNode;
  /** Initial selected tab id (uncontrolled); ignored when `selectedTabId` is provided. */
  defaultSelectedTabId?: string;
  /** Currently selected tab id (controlled); `onTabChange` fires on every click either way. */
  selectedTabId?: string;
  /** Called when the user clicks a tab. */
  onTabChange?: (id: string) => void;
};
