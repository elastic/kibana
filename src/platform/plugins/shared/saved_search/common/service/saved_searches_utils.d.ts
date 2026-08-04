import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { SavedSearch } from '..';
import type { SavedSearchAttributes, SerializableSavedSearch } from '../types';
import type { DiscoverSessionAttributes } from '../../server';
export declare const fromDiscoverSessionAttributesToSavedSearch: <Serialized extends boolean = false, ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch>(id: string | undefined, { title, description, tabs }: DiscoverSessionAttributes, tags: string[] | undefined, searchSource: SavedSearch["searchSource"] | SerializedSearchSourceFields, managed: boolean, serialized?: Serialized, sharingSavedObjectProps?: SavedSearch["sharingSavedObjectProps"], references?: SavedObjectReference[]) => ReturnType;
export declare const toSavedSearchAttributes: (savedSearch: SavedSearch, searchSourceJSON: string) => SavedSearchAttributes;
