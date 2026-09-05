/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEventHandler, ReactNode } from 'react';
import type { EuiIconProps } from '@elastic/eui';

interface FlyoutSectionActionBase {
  label: ReactNode;
  'data-test-subj'?: string;
}

type FlyoutSectionLinkAction = FlyoutSectionActionBase & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: never;
};

type FlyoutSectionButtonAction = FlyoutSectionActionBase & {
  onClick: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  href?: never;
  target?: never;
  rel?: never;
};

export type FlyoutSectionAction = FlyoutSectionLinkAction | FlyoutSectionButtonAction;

export interface FlyoutSectionProps {
  /** Seeds the section's DOM id and the title id naming it; auto-generated when omitted. */
  id?: string;
  /** Section title */
  title: ReactNode;
  /** Icon beside the title */
  icon?: EuiIconProps['type'];
  /** Tooltip shown for icon beside the title */
  tooltip?: ReactNode;
  action?: FlyoutSectionAction;
  hasBorder?: boolean;
  /**
   * The border belongs to bordered children, so the section reports itself as bordered without
   * wrapping them in a second panel. Requires `hasBorder`.
   */
  borderOnChildren?: boolean;
  'data-test-subj'?: string;
  children?: ReactNode;
}

export interface FlyoutSubsectionProps {
  /** DOM id for the subsection wrapper, for use as a scroll or link target. */
  id?: string;
  title: ReactNode;
  hasBorder?: boolean;
  'data-test-subj'?: string;
  children?: ReactNode;
}

export interface FlyoutAccordionProps {
  /** Seeds the accordion's internal DOM id; auto-generated when omitted. */
  id?: string;
  /** Accordion title, styled to match a section title. */
  title: ReactNode;
  /** Icon beside the title; defaults to `info` when `tooltip` is set. */
  icon?: EuiIconProps['type'];
  /** Tooltip shown from an icon to the right of the title. */
  tooltip?: ReactNode;
  action?: FlyoutSectionAction;
  initialIsOpen?: boolean;
  hasBorder?: boolean;
  'data-test-subj'?: string;
  children?: ReactNode;
}
