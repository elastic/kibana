import type { FC } from 'react';
import React from 'react';
import type { MetadataFormState } from './use_metadata_form';
import type { Services } from '../services';
interface Props {
    form: MetadataFormState & {
        isSubmitted: boolean;
    };
    isReadonly: boolean;
    readonlyReason: string;
    TagList?: Services['TagList'];
    TagSelector?: Services['TagSelector'];
}
export declare const MetadataForm: FC<React.PropsWithChildren<Props>>;
export {};
