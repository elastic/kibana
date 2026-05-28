/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBannerProps } from '@elastic/eui';

/**
 * Props for the primary action button. Rendered as an `EuiButton`.
 * `color`, `size` and `fill` are controlled by the component.
 */
export type AnnouncementBannerActionPrimaryProps = NonNullable<
  EuiBannerProps['actionProps']
>['primary'];

/**
 * Props for the secondary action button. Rendered as an `EuiButtonEmpty`.
 * `color`, `size` and `flush` are controlled by the component.
 */
export type AnnouncementBannerActionSecondaryProps = NonNullable<
  EuiBannerProps['actionProps']
>['secondary'];

/**
 * Props spread onto the dismiss `EuiButtonIcon`. `onClick` is controlled by
 * the component (use the `onDismiss` callback prop instead). Every other prop
 * is optional — the component supplies sensible defaults.
 */
export type AnnouncementBannerDismissButtonProps = EuiBannerProps['dismissButtonProps'];

/** Visual size of the announcement. */
export type AnnouncementBannerSize = EuiBannerProps['size'];

export type AnnouncementBannerProps = Omit<EuiBannerProps, 'announceOnMount'>;
