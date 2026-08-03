import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import type { ValidationFunc } from '../shared_imports';
export declare const singleAstriskValidator: (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc>;
export declare const schema: {
    title: {
        label: string;
        defaultValue: string;
        validations: {
            validator: (data: import("../shared_imports").ValidationFuncArg<import("../../../es_ui_shared/static/forms/hook_form_lib").FormData, unknown>) => ReturnType<ValidationFunc>;
        }[];
    };
    name: {
        label: string;
        defaultValue: string;
        validations: never[];
    };
    timestampField: {
        label: string;
        helpText: string;
        validations: never[];
    };
    allowHidden: {
        label: string;
        defaultValue: boolean;
    };
    id: {
        label: string;
        helpText: string;
    };
    type: {
        label: string;
        defaultValue: INDEX_PATTERN_TYPE;
    };
    isAdHoc: {
        label: string;
        defaultValue: boolean;
        type: string;
    };
};
