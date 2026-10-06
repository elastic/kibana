/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
type ILinkTab = IModalTabDeclaration<{
  dashboardUrl: string;
  isNotSaved: boolean;
  setIsClicked: boolean;
}>;
export declare const linkTab: ILinkTab;
export {};
