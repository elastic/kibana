import type { SavedObjectsOpenPointInTimeOptions, SavedObjectsFindInternalOptions, SavedObjectsOpenPointInTimeResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerforOpenPointInTimeParams {
    type: string | string[];
    options: SavedObjectsOpenPointInTimeOptions;
    internalOptions: SavedObjectsFindInternalOptions;
}
export declare const performOpenPointInTime: <T>({ type, options, internalOptions }: PerforOpenPointInTimeParams, { helpers, allowedTypes: rawAllowedTypes, client, extensions }: ApiExecutionContext) => Promise<SavedObjectsOpenPointInTimeResponse>;
