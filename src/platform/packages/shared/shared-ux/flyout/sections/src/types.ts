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
  /** Section title */
  title: ReactNode;
  /** Icon beside the title */
  icon?: EuiIconProps['type'];
  /** Tooltip shown for icon beside the title */
  tooltip?: ReactNode;
  action?: FlyoutSectionAction;
  hasBorder?: boolean;
  'data-test-subj'?: string;
  children?: ReactNode;
}

export interface FlyoutSubsectionProps {
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
