import type { HttpSetup, NotificationsSetup, DocLinksStart, ApplicationStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { RouteComponentProps } from 'react-router-dom';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AutocompleteInfo } from '../services';
import type { ConsoleStartServices } from '../types';
export interface BootDependencies extends ConsoleStartServices {
    http: HttpSetup;
    docLinkVersion: string;
    notifications: NotificationsSetup;
    usageCollection?: UsageCollectionSetup;
    application: ApplicationStart;
    data: DataPublicPluginStart;
    licensing: LicensingPluginStart;
    element: HTMLElement;
    history: RouteComponentProps['history'];
    docLinks: DocLinksStart['links'];
    autocompleteInfo: AutocompleteInfo;
    isDevMode: boolean;
}
export declare function renderApp({ notifications, docLinkVersion, usageCollection, application, data, licensing, element, history, http, docLinks, autocompleteInfo, isDevMode, ...startServices }: BootDependencies): Promise<() => boolean>;
