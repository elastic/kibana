import type { AttributeField } from './attributes_overview';
interface GroupAttributesFieldsParams {
    allFields: string[];
    flattened: Record<string, unknown>;
    searchTerm: string;
    shouldShowFieldHandler: (fieldName: string) => boolean;
    isEsqlMode: boolean;
    areNullValuesHidden?: boolean;
}
export declare function groupAttributesFields({ allFields, flattened, searchTerm, shouldShowFieldHandler, isEsqlMode, areNullValuesHidden, }: GroupAttributesFieldsParams): {
    attributesFields: AttributeField[];
    resourceAttributesFields: AttributeField[];
    scopeAttributesFields: AttributeField[];
};
export {};
