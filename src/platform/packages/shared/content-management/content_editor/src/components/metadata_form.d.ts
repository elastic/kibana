import type { FC } from 'react';
import React from 'react';
import type { MetadataFormState } from './use_metadata_form';
import type { SavedObjectsReference, Services } from '../services';
interface Props {
    form: MetadataFormState & {
        isSubmitted: boolean;
    };
    isReadonly: boolean;
    readonlyReason: string;
    tagsReferences: SavedObjectsReference[];
    TagList?: Services['TagList'];
    TagSelector?: Services['TagSelector'];
}
export declare const MetadataForm: FC<React.PropsWithChildren<Props>>;
export {};
