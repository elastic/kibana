/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type IShareContext } from '../../context';
import type { LinkShareConfig, LinkShareUIConfig } from '../../../types';
type LinkProps = Pick<
  IShareContext,
  | 'objectType'
  | 'objectId'
  | 'isDirty'
  | 'shareableUrl'
  | 'shareableUrlLocatorParams'
  | 'allowShortUrl'
> &
  LinkShareConfig['config'] & {
    objectConfig?: LinkShareUIConfig;
  };
export declare const LinkContent: ({
  isDirty,
  objectType,
  objectConfig,
  shareableUrl,
  shortUrlService,
  shareableUrlLocatorParams,
  allowShortUrl,
}: LinkProps) => React.JSX.Element;
export {};
