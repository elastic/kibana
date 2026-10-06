import * as React from 'react';
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
