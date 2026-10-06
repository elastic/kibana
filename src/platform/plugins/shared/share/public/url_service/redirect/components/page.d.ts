/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as React from 'react';
import type { CustomBrandingSetup } from '@kbn/core-custom-branding-browser';
import type { ChromeDocTitle, ThemeServiceSetup } from '@kbn/core/public';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { RedirectManager } from '../redirect_manager';
export interface PageProps {
  homeHref: string;
  docTitle: ChromeDocTitle;
  customBranding: CustomBrandingSetup;
  manager: Pick<RedirectManager, 'error$'>;
  theme: ThemeServiceSetup;
  userProfile: UserProfileService;
}
export declare const Page: React.FC<PageProps>;
