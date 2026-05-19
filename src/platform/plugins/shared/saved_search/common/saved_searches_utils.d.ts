import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { SavedSearch, SavedSearchAttributes } from '.';
import type { SerializableSavedSearch } from './types';
export declare const fromSavedSearchAttributes: <Serialized extends boolean = false, ReturnType = Serialized extends true ? SerializableSavedSearch : SavedSearch>(id: string | undefined, { title, description, tabs }: SavedSearchAttributes, tags: string[] | undefined, searchSource: SavedSearch["searchSource"] | SerializedSearchSourceFields, managed: boolean, serialized?: Serialized) => ReturnType;
