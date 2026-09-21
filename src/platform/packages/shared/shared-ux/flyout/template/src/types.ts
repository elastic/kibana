/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEventHandler, ReactNode } from 'react';
import type {
  DataAttributeProps,
  EuiBadgeProps,
  EuiButtonEmptyProps,
  EuiButtonProps,
  EuiFlyoutProps,
  EuiIconProps,
  EuiTabProps,
} from '@elastic/eui';
import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import type { MetaBlock } from '@kbn/flyout-meta-blocks';
import type {
  FlyoutSectionAction,
  FlyoutSectionProps,
  FlyoutSubsectionProps,
  FlyoutAccordionProps,
} from '@kbn/flyout-sections';

/** Selection state is derived from the root `selectedTabId`, so a tab entry cannot set it. */
type TabBarOwnedProps = 'isSelected';

/**
 * Props for a single tab entry in the root `tabs` array. Everything besides `id` and `label`
 * reaches the underlying `EuiTab`.
 */
export type FlyoutTabProps = Omit<EuiTabProps, TabBarOwnedProps> &
  DataAttributeProps & {
    /**
     * Stable identifier, used to link the tab to its `Body.TabPanel`. Distinct from the tab's
     * DOM id, which the template generates to pair the tab with its panel.
     */
    id: string;
    /** Tab label rendered inside `EuiTab`. */
    label: ReactNode;
  };

/** Props for the declarative `FlyoutTemplate.Body.TabPanel` part. */
export interface FlyoutBodyTabPanelProps {
  /** The `id` of the root `tabs` entry this panel belongs to. Non-matching ids are silently ignored in tabbed mode. */
  tabId: string;
  children?: ReactNode;
  'data-test-subj'?: string;
}

/** Props for the declarative `FlyoutTemplate.Header` zone. */
export interface FlyoutHeaderProps {
  /** Title rendered by the header. Rendered as an `<h3>` (heading level is owned by the template). */
  title: ReactNode;
  'data-test-subj'?: string;
  /**
   * `Header.MetaBlock`, `Header.Badge`, and `Header.InfoBlock` parts.
   * Free-form content is not rendered.
   */
  children?: ReactNode;
  /** Icon beside the title; defaults to `info` when `titleTooltip` is set. */
  titleIcon?: EuiIconProps['type'];
  /** Tooltip shown from the title icon. */
  titleTooltip?: ReactNode;
  /** Subdued text below the title. */
  description?: ReactNode;
  /**
   * When true, the header is permanently rendered in its compact collapsed layout regardless of
   * scroll position. The description, meta blocks, badges, and info blocks are not shown.
   */
  collapsed?: boolean;
}

/** A block part authors its value as children, and the header zone fills in its `id`. */
type BlockPartOwnedProps = 'id' | 'value';

/** Props for the declarative `FlyoutTemplate.Header.MetaBlock` part. */
export type FlyoutHeaderMetaBlockProps = Omit<MetaBlock, BlockPartOwnedProps> &
  DataAttributeProps & {
    /** Optional explicit instance id; auto-generated when omitted. */
    id?: string;
    /** The pair's value; accepts rich content such as links. */
    children: ReactNode;
  };

/** Props owned by the template. `children` is the badge label and `id` identifies the part instance. */
type BadgePartOwnedProps = 'children' | 'id';

/**
 * Props that would turn the badge into a control. Badges in a flyout header are meant to label the
 * subject, not act as controls.
 */
type BadgeControlProps =
  | 'onClick'
  | 'onClickAriaLabel'
  | 'iconOnClick'
  | 'iconOnClickAriaLabel'
  | 'href'
  | 'target'
  | 'rel';

/** Props for the declarative `FlyoutTemplate.Header.Badge` part. */
export type FlyoutHeaderBadgeProps = Omit<EuiBadgeProps, BadgePartOwnedProps | BadgeControlProps> &
  DataAttributeProps & {
    /** Optional explicit instance id; auto-generated when omitted. */
    id?: string;
    /** Badge label. */
    children: ReactNode;
  };

/** Props for the declarative `FlyoutTemplate.Header.InfoBlock` part. */
export type FlyoutHeaderInfoBlockProps = Omit<InfoBlockItem, BlockPartOwnedProps> &
  DataAttributeProps & {
    /** Optional explicit instance id; auto-generated when omitted. */
    id?: string;
    /** The block's value content. */
    children: ReactNode;
  };

/** Action link rendered right-aligned on a section or accordion title row. */
export type FlyoutBodySectionAction = FlyoutSectionAction;

/** Props for the declarative `FlyoutTemplate.Body.Section` part. `borderOnChildren` is derived from the children, not authored. */
export type FlyoutBodySectionProps = Omit<FlyoutSectionProps, 'borderOnChildren'>;

/** Props for the declarative body subsection part. `hasBorder` is inherited from the parent, not authored. */
export type FlyoutBodySubsectionProps = Omit<FlyoutSubsectionProps, 'hasBorder'>;

/** Props for the declarative `FlyoutTemplate.Body.Accordion` part. */
export type FlyoutBodyAccordionProps = Omit<FlyoutAccordionProps, 'hasBorder'>;

/** Props for the declarative `FlyoutTemplate.Body` zone. */
export interface FlyoutBodyProps {
  'data-test-subj'?: string;
  /**
   * `Body.Section`, `Body.Accordion`, or `Body.TabPanel` parts, and/or arbitrary
   * content (callouts, search bars, data grids) rendered as-is in source order.
   */
  children?: ReactNode;
}

/** Props shared by the declarative footer action parts. Both render a button and never an anchor. */
interface FlyoutFooterActionBaseProps extends DataAttributeProps {
  /** HTML id forwarded to the button element. */
  id?: string;
  /** Button label. */
  label: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

/** Props for the declarative `FlyoutTemplate.Footer.PrimaryAction` part. */
export type FlyoutFooterPrimaryActionProps = Omit<EuiButtonProps, 'children' | 'fill'> &
  FlyoutFooterActionBaseProps;

/** Props for the declarative `FlyoutTemplate.Footer.SecondaryAction` part. */
export type FlyoutFooterSecondaryActionProps = Omit<
  EuiButtonEmptyProps,
  'children' | 'onClick' | 'href' | 'target' | 'rel' | 'buttonRef'
> &
  FlyoutFooterActionBaseProps;

/** Props for the declarative `FlyoutTemplate.Footer` zone. */
export interface FlyoutFooterProps {
  'data-test-subj'?: string;
  /** `Footer.PrimaryAction` / `Footer.SecondaryAction` parts. */
  children?: ReactNode;
}

/**
 * `children` represents the declarative zones rather than free-form flyout content. 
 * `flyoutMenuDisplayMode` is always set to `auto`. 
 * `ref` is omitted because the template does not forward it.
 */
type TemplateOwnedFlyoutProps = 'children' | 'flyoutMenuDisplayMode' | 'ref';

/**
 * Props for the root `FlyoutTemplate` component. Any props not explicitly named by the template,
 * as well as any `data-*` attributes, are passed to the underlying `EuiFlyout`.
 */
export type FlyoutTemplateProps = Omit<EuiFlyoutProps, TemplateOwnedFlyoutProps> &
  DataAttributeProps & {
    /** Declarative zone children: `FlyoutTemplate.Header`, `.Body`, `.Footer`. */
    children?: ReactNode;
    /** Tabs rendered in the header bar. Omit for a flyout with no tabs. */
    tabs?: FlyoutTabProps[];
    /** Initial selected tab id (uncontrolled); ignored when `selectedTabId` is provided. */
    defaultSelectedTabId?: string;
    /** Currently selected tab id (controlled); `onTabChange` fires on every click either way. */
    selectedTabId?: string;
    /** Called when the user clicks a tab. */
    onTabChange?: (id: string) => void;
  };
