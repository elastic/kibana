import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { TelemetrySavedObject } from './types';
type GetTelemetrySavedObject = (soClient: SavedObjectsClientContract) => Promise<TelemetrySavedObject>;
export declare const getTelemetrySavedObject: GetTelemetrySavedObject;
export {};
