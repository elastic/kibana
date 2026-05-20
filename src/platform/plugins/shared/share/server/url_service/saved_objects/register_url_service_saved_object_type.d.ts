import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { ServerUrlService } from '..';
export declare const registerUrlServiceSavedObjectType: (so: Pick<SavedObjectsServiceSetup, "registerType">, service: ServerUrlService) => void;
