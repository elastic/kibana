import React from 'react';
import type { Query } from '@kbn/es-query';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
export interface QueryInputServices {
    http: HttpStart;
    storage: IStorageWrapper;
    dataViews: DataViewsPublicPluginStart;
    data: DataPublicPluginStart;
    uiSettings: IUiSettingsClient;
    notifications: NotificationsStart;
    kql: KqlPluginStart;
    docLinks: DocLinksStart;
}
export declare const QueryInput: ({ value, onChange, dataView, isInvalid, onSubmit, disableAutoFocus, ["data-test-subj"]: dataTestSubj, placeholder, appName, services: { data, uiSettings, http, notifications, docLinks, storage, kql, dataViews }, }: {
    value: Query;
    onChange: (input: Query) => void;
    dataView: string | {
        type: "title" | "id";
        value: string;
    };
    isInvalid: boolean;
    onSubmit: () => void;
    disableAutoFocus?: boolean;
    "data-test-subj"?: string;
    placeholder?: string;
    appName: string;
    services: QueryInputServices;
}) => React.JSX.Element;
