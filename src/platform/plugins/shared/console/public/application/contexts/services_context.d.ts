import React from 'react';
import type { NotificationsSetup, DocLinksStart, HttpSetup } from '@kbn/core/public';
import type { RouteComponentProps } from 'react-router-dom';
import type { ApplicationStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AutocompleteInfo, History, Settings, Storage } from '../../services';
import type { ObjectStorageClient } from '../../../common/types';
import type { ConsoleStartServices, MetricsTracker } from '../../types';
import type { EsHostService } from '../lib';
interface ContextServices {
    routeHistory?: RouteComponentProps['history'];
    history: History;
    storage: Storage;
    settings: Settings;
    notifications: Pick<NotificationsSetup, 'toasts'>;
    objectStorageClient: ObjectStorageClient;
    trackUiMetric: MetricsTracker;
    esHostService: EsHostService;
    http: HttpSetup;
    autocompleteInfo: AutocompleteInfo;
    data: DataPublicPluginStart;
    licensing: LicensingPluginStart;
    application: ApplicationStart;
}
export interface ContextValue extends ConsoleStartServices {
    services: ContextServices;
    docLinkVersion: string;
    docLinks: DocLinksStart['links'];
    config: {
        isDevMode: boolean;
        isPackagedEnvironment?: boolean;
    };
}
interface ContextProps {
    value: ContextValue;
    children: JSX.Element;
}
export declare function ServicesContextProvider({ children, value }: ContextProps): React.JSX.Element;
export declare const useServicesContext: () => ContextValue;
export {};
