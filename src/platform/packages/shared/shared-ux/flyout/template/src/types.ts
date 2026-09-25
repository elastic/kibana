/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import type {
  DataAttributeProps,
  EuiBadgeProps,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiContextMenuProps,
  EuiFlyoutProps,
  EuiIconProps,
  EuiTabProps,
} from '@elastic/eui';
// FIXME: change to import from `@elastic/eui` once https://github.com/elastic/eui/pull/10064 is merged.
import type { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import type { MetaBlock } from '@kbn/flyout-meta-blocks';
import type {
  FlyoutSectionAction,
  FlyoutSectionProps,
  FlyoutSubsectionProps,
  FlyoutAccordionProps,
} from '@kbn/flyout-sections';
import type { KbnCalloutProps } from '@kbn/ui-callout';

type TabBarOwnedProps = 'aria-controls' | 'children' | 'id' | 'isSelected' | 'onClick';

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

/** Severity of a `Body.Callout`; each maps to exactly one `@kbn/ui-callout` component. */
export type FlyoutBodyCalloutLevel = 'info' | 'success' | 'warning' | 'danger';

/**
 * The template owns every banner callout's size and styling so they look the same. `heading` is
 * owned too: callout titles stay `<p>` and out of the flyout's heading outline.
 */
type CalloutOwnedProps = 'size' | 'heading' | 'className' | 'css' | 'style';

/** Props for the declarative `FlyoutTemplate.Body.Callout` part. */
export type FlyoutBodyCalloutProps = Omit<KbnCalloutProps, CalloutOwnedProps | 'id'> &
  DataAttributeProps & {
    /** Selects `KbnInfoCallout`, `KbnSuccessCallout`, `KbnWarningCallout`, or `KbnDangerCallout`. */
    level: FlyoutBodyCalloutLevel;
    /** Optional explicit instance id; auto-generated when omitted. */
    id?: string;
  };

/** Props for the declarative `FlyoutTemplate.Body` zone. */
export interface FlyoutBodyProps {
  'data-test-subj'?: string;
  /**
   * `Body.Callout`, `Body.Section`, `Body.Accordion`, or `Body.TabPanel` parts, and/or arbitrary
   * content (search bars, data grids) rendered as-is in source order. `Body.Callout` parts render
   * in the body's banner, above everything else.
   */
  children?: ReactNode;
}

type ActionOwnedProps =
  | 'buttonRef'
  | 'children'
  | 'color'
  | 'element'
  | 'fill'
  | 'fullWidth'
  | 'size';

/** Props shared by the declarative footer action parts. Both render a button and never an anchor. */
interface FlyoutFooterActionBaseProps extends DataAttributeProps {
  /** HTML id forwarded to the button element. */
  id?: string;
  /** Button label. */
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

/** Props for the declarative `FlyoutTemplate.Footer.PrimaryAction` part. */
export type FlyoutFooterPrimaryActionProps = Omit<
  EuiButtonPropsForButton,
  ActionOwnedProps | 'onClick'
> &
  FlyoutFooterActionBaseProps;

/** Props for the declarative `FlyoutTemplate.Footer.SecondaryAction` part. */
export type FlyoutFooterSecondaryActionProps = Omit<
  EuiButtonPropsForButton,
  ActionOwnedProps | 'onClick' | 'minWidth'
> &
  FlyoutFooterActionBaseProps;

/**
 * A single item in a footer action menu (either a clickable action or a separator).
 */
type WithStringName<T> = T extends { name: ReactNode } ? Omit<T, 'name'> & { name: string } : T;

export type FlyoutFooterMenuItem = WithStringName<
  Extract<EuiContextMenuPanelItemDescriptor, { renderItem?: never }>
>;

/**
 * A sub-menu panel inside a footer action menu.
 */
export type FlyoutFooterMenuPanel = Omit<
  EuiContextMenuPanelDescriptor,
  'content' | 'items' | 'title'
> & {
  items: FlyoutFooterMenuItem[];
  /**
   * The title of this sub-menu. This is required if users navigate into this panel,
   * as it's used to generate the "Back" button and its screen reader text.
   */
  title?: string;
  content?: never;
};

type MenuTriggerOwnedProps =
  | 'children'
  | 'color'
  | 'fill'
  | 'iconType'
  | 'iconSide'
  | 'element'
  | 'onClick'
  | 'isSelected'
  | 'size'
  | 'aria-haspopup'
  | 'aria-pressed'
  | 'type';

/**
 * Props for the <FlyoutTemplate.Footer.PrimaryActionMenu> component.
 *
 * Anything `EuiButton` accepts for a button element is forwarded to the trigger button,
 * apart from the props the template owns. The props declared below configure the menu itself.
 */
export type FlyoutFooterPrimaryActionMenuProps = Omit<
  EuiButtonPropsForButton,
  MenuTriggerOwnedProps | 'aria-label' | 'data-test-subj'
> &
  Pick<EuiContextMenuProps, 'onPanelChange'> &
  DataAttributeProps & {
    /** The text on the button that opens the menu (e.g. "Take action"). */
    label: string;
    /** The panels and items inside the menu. For performance and to keep keyboard navigation working, you should wrap this array in a useMemo hook. */
    panels: FlyoutFooterMenuPanel[];
    /** The ID of the menu panel to show first. If omitted, it defaults to the first panel in the array. */
    initialPanelId?: string | number;
    /**
     * If true, the menu will automatically close when a user clicks an item. Defaults to true.
     * (Navigating to sub-menus will never auto-close the menu).
     */
    closeOnItemClick?: boolean;
    /** Custom accessible name for the popover. If omitted, it falls back to the button's label. */
    'aria-label'?: string;
    /** Used for testing. The button gets this exact value, and the popover panel gets this value with "Panel" appended. */
    'data-test-subj'?: string;
    /** Sets a fixed height for the menu, allowing the inside to scroll if it gets too long. */
    height?: CSSProperties['height'];
  };

/** Props for the declarative `FlyoutTemplate.Footer` zone. */
export interface FlyoutFooterProps {
  'data-test-subj'?: string;
  /** `Footer.PrimaryAction`, `Footer.PrimaryActionMenu`, and `Footer.SecondaryAction` parts. */
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
