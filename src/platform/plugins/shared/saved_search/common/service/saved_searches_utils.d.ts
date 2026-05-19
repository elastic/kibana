import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { SavedSearch } from '..';
import type { SavedSearchAttributes, SerializableSavedSearch } from '../types';
export declare const fromSavedSearchAttributes: (id: string | undefined, attributes: SavedSearchAttributes, tags: string[] | undefined, references: SavedObjectReference[] | undefined, searchSource: SavedSearch["searchSource"] | SerializedSearchSourceFields, sharingSavedObjectProps: SavedSearch["sharingSavedObjectProps"], managed: boolean, serialized?: boolean) => SavedSearch | SerializableSavedSearch;
export declare const toSavedSearchAttributes: (savedSearch: SavedSearch, searchSourceJSON: string) => SavedSearchAttributes;
