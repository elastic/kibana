import type { SavedObjectsFieldMapping } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '../types';
export declare function getProperty(mappings: IndexMapping | SavedObjectsFieldMapping, path: string | string[]): SavedObjectsFieldMapping | undefined;
