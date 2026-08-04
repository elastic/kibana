import React from 'react';
import { type EuiBannerProps } from '@elastic/eui';
/**
 * Props for the primary action button. Rendered as an `EuiButton`.
 * `color`, `size` and `fill` are controlled by the component.
 */
export type AnnouncementBannerActionPrimaryProps = NonNullable<EuiBannerProps['actionProps']>['primary'];
/**
 * Props for the secondary action button. Rendered as an `EuiButtonEmpty`.
 * `color`, `size` and `flush` are controlled by the component.
 *
 * It's only rendered in combination with a primary action.
 */
export type AnnouncementBannerActionSecondaryProps = NonNullable<EuiBannerProps['actionProps']>['secondary'];
export type AnnouncementBannerProps = Omit<EuiBannerProps, 'announceOnMount'>;
/**
 * A banner-style announcement with optional media, actions and dismiss button.
 *
 * Layout adapts to the host container via container queries (super narrow,
 * narrow, wide) — there is no `width` prop. The visual scale is controlled by
 * the `size` prop.
 */
export declare const AnnouncementBanner: (props: AnnouncementBannerProps) => React.JSX.Element;
