import React from 'react';
import type { AnnouncementBannerProps } from './types';
/**
 * A banner-style announcement with optional media, actions and dismiss button.
 *
 * Layout adapts to the host container via container queries (super narrow,
 * narrow, wide) — there is no `width` prop. The visual scale is controlled by
 * the `size` prop.
 */
export declare const AnnouncementBanner: ({ title, headingElement, text, size, color, actionProps, media, onDismiss, dismissButtonProps, children, className, css: cssStyles, announceOnMount, "data-test-subj": dataTestSubj, }: AnnouncementBannerProps) => React.JSX.Element;
