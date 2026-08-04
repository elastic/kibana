import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SearchSessionSavedObjectAttributes, SearchSessionStatus } from '../../../../common';
export declare const DATE_STRING_FORMAT = "D MMM, YYYY, HH:mm:ss";
/**
 * Some properties are optional for a non-persisted Search Session.
 * This interface makes them mandatory, because management only shows persisted search sessions.
 */
export type PersistedSearchSessionSavedObjectAttributes = SearchSessionSavedObjectAttributes & Required<Pick<SearchSessionSavedObjectAttributes, 'name' | 'appId' | 'locatorId' | 'initialState' | 'restoreState'>>;
export type UISearchSessionState = SearchSessionStatus;
export declare enum ACTION {
    INSPECT = "inspect",
    EXTEND = "extend",
    DELETE = "delete",
    RENAME = "rename"
}
export interface UISession {
    id: string;
    name: string;
    appId: string;
    created: string;
    expires: string | null;
    status: UISearchSessionState;
    idMapping: SearchSessionSavedObjectAttributes['idMapping'];
    numSearches: number;
    actions?: ACTION[];
    reloadUrl: string;
    restoreUrl: string;
    initialState: Record<string, unknown>;
    restoreState: Record<string, unknown>;
    version: string;
    errors?: string[];
}
export type LocatorsStart = SharePluginStart['url']['locators'];
export interface SearchSessionSavedObject {
    id: string;
    attributes: PersistedSearchSessionSavedObjectAttributes;
}
export type BackgroundSearchOpenedHandler = (attrs: {
    session: UISession;
    event: React.MouseEvent<HTMLAnchorElement>;
}) => void;
