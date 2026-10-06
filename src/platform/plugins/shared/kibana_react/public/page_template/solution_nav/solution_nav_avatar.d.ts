/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent } from 'react';
import type { DistributiveOmit, EuiAvatarProps } from '@elastic/eui';
export type KibanaPageTemplateSolutionNavAvatarProps = DistributiveOmit<EuiAvatarProps, 'size'> & {
  /**
   * Any EuiAvatar size available, of `xxl` for custom large, brand-focused version
   */
  size?: EuiAvatarProps['size'] | 'xxl';
};
/**
 * Applies extra styling to a typical EuiAvatar
 */
export declare const KibanaPageTemplateSolutionNavAvatar: FunctionComponent<KibanaPageTemplateSolutionNavAvatarProps>;
