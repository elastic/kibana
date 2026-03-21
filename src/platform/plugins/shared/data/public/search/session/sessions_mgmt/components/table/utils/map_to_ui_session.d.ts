import type { SearchSessionsFindResponse } from '../../../../../../../common';
import type { ACTION, LocatorsStart, SearchSessionSavedObject, UISession } from '../../../types';
export declare const mapToUISession: ({ savedObject, locators, sessionStatuses, actions: filteredActions, }: {
    savedObject: SearchSessionSavedObject;
    locators: LocatorsStart;
    sessionStatuses: SearchSessionsFindResponse["statuses"];
    actions?: ACTION[];
}) => UISession;
