import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { FieldConfig, RuntimeType, ValidationFunc } from '../../shared_imports';
export declare const schema: {
    name: {
        label: string;
        validations: {
            validator: (data: import("@kbn/ingest-pipelines-plugin/public/shared_imports").ValidationFuncArg<import("@kbn/ingest-pipelines-plugin/public/shared_imports").FormData, unknown>) => ReturnType<ValidationFunc<any, import("../../../../es_ui_shared/static/forms/helpers/field_validators/types").ERROR_CODE>>;
        }[];
    };
    type: FieldConfig<Array<EuiComboBoxOptionOption<RuntimeType>>>;
    script: {
        source: {
            label: string;
            validations: ({
                validator: (data: import("@kbn/ingest-pipelines-plugin/public/shared_imports").ValidationFuncArg<import("@kbn/ingest-pipelines-plugin/public/shared_imports").FormData, unknown>) => ReturnType<ValidationFunc<any, import("../../../../es_ui_shared/static/forms/helpers/field_validators/types").ERROR_CODE>>;
                isAsync?: undefined;
            } | {
                validator: ValidationFunc;
                isAsync: boolean;
            })[];
        };
    };
    customLabel: {
        label: string;
        validations: {
            validator: (data: import("@kbn/ingest-pipelines-plugin/public/shared_imports").ValidationFuncArg<import("@kbn/ingest-pipelines-plugin/public/shared_imports").FormData, unknown>) => ReturnType<ValidationFunc<any, import("../../../../es_ui_shared/static/forms/helpers/field_validators/types").ERROR_CODE>>;
        }[];
    };
    customDescription: {
        label: string;
        validations: {
            validator: (data: import("@kbn/ingest-pipelines-plugin/public/shared_imports").ValidationFuncArg<import("@kbn/ingest-pipelines-plugin/public/shared_imports").FormData, unknown>) => ReturnType<ValidationFunc<any, import("../../../../es_ui_shared/static/forms/helpers/field_validators/types").ERROR_CODE>>;
        }[];
    };
    popularity: {
        label: string;
        validations: {
            validator: (data: import("@kbn/ingest-pipelines-plugin/public/shared_imports").ValidationFuncArg<import("@kbn/ingest-pipelines-plugin/public/shared_imports").FormData, unknown>) => ReturnType<ValidationFunc<any, import("../../../../es_ui_shared/static/forms/helpers/field_validators/types").ERROR_CODE>>;
        }[];
    };
    fields: {
        defaultValue: {};
    };
    __meta__: {
        isCustomLabelVisible: {
            defaultValue: boolean;
        };
        isCustomDescriptionVisible: {
            defaultValue: boolean;
        };
        isValueVisible: {
            defaultValue: boolean;
        };
        isFormatVisible: {
            defaultValue: boolean;
        };
        isPopularityVisible: {
            defaultValue: boolean;
        };
    };
};
