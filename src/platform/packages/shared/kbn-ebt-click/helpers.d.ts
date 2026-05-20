import type { EbtClickAttrs } from './types';
/** Maps an EbtClickAttrs object to the corresponding `data-ebt-*` HTML attributes. */
export declare function getEbtProps(ebt: EbtClickAttrs): {
    'data-ebt-action': string;
    'data-ebt-element': string;
    'data-ebt-detail'?: string;
};
