import type { StartServices, VisSavedObject } from '../../types';
import type { VisualizationSavedObjectAttributes, VisualizationSavedObject } from '../../../common';
import type { CreateOptions } from '../../../common/content_management';
/**
 * Attempts to create the current object using the serialized source. If an object already
 * exists, a warning message requests an overwrite confirmation.
 * @param source - serialized version of this object what will be indexed into elasticsearch.
 * @param savedObject - VisSavedObject
 * @param options - options to pass to the saved object create method
 * @param services - provides Kibana services savedObjectsClient and overlays
 * @returns {Promise} - A promise that is resolved with the objects id if the object is
 * successfully indexed. If the overwrite confirmation was rejected, an error is thrown with
 * a confirmRejected = true parameter so that case can be handled differently than
 * a create or index error.
 * @resolved {SimpleSavedObject}
 */
export declare function saveWithConfirmation(source: VisualizationSavedObjectAttributes, savedObject: Pick<VisSavedObject, 'title' | 'displayName'>, options: CreateOptions, services: StartServices): Promise<{
    item: VisualizationSavedObject;
}>;
