import type { Reference } from '@kbn/content-management-utils';
import type { VisSavedObject } from '../../types';
import type { SerializableAttributes } from '../../vis_types/vis_type_alias_registry';
export declare function convertSavedObjectAttributesToReferences(attributes: {
    kibanaSavedObjectMeta?: {
        searchSourceJSON: string;
    };
    savedSearchId?: string;
}): Reference[];
export declare function extractReferences({ attributes, references, }: {
    attributes: SerializableAttributes;
    references: Reference[];
}): {
    references: Reference[];
    attributes: {
        [key: string]: unknown;
    };
};
export declare function injectReferences(savedObject: VisSavedObject, references: Reference[]): void;
