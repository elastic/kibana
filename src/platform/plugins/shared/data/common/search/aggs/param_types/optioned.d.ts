import type { IAggConfig } from '../agg_config';
import { BaseParamType } from './base';
export interface OptionedValueProp {
    value: string;
    text: string;
    disabled?: boolean;
    isCompatible: (agg: IAggConfig) => boolean;
}
export declare class OptionedParamType extends BaseParamType {
    options: OptionedValueProp[];
    constructor(config: Record<string, any>);
}
