/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
interface Props {
  addDataHref: string;
  application: ApplicationStart;
  devToolsHref?: string;
  hidden?: boolean;
  managementHref?: string;
  showDevToolsLink?: boolean;
  showManagementLink?: boolean;
}
export declare const overviewPageActions: ({
  addDataHref,
  application,
  devToolsHref,
  hidden,
  managementHref,
  showDevToolsLink,
  showManagementLink,
}: Props) => (React.JSX.Element | null)[];
export {};
