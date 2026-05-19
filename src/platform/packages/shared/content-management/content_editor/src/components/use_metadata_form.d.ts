import type { Item } from '../types';
export interface Field<TValueType = unknown> {
    value: TValueType;
    isChangingValue: boolean;
    errors?: string[];
    warnings?: string[];
}
interface Fields {
    title: Field<string>;
    description: Field<string>;
    tags: Field<string[]>;
}
interface Validator<TValueType = unknown> {
    type: 'warning' | 'error';
    fn: (value: TValueType, id: Item['id']) => undefined | string | Promise<undefined | string>;
}
type BasicValidators = Partial<{
    [key in keyof Fields]: Array<Validator<Fields[key]['value']>> | undefined;
}>;
export type CustomValidators = Pick<BasicValidators, 'title' | 'description'>;
type SetFieldValueFn<TField extends keyof Fields> = (value: Fields[TField]['value']) => void;
export declare const useMetadataForm: ({ item, customValidators, }: {
    item: Item;
    customValidators?: CustomValidators;
}) => {
    title: Field<string>;
    setTitle: SetFieldValueFn<"title">;
    description: Field<string>;
    setDescription: SetFieldValueFn<"description">;
    tags: Field<string[]>;
    setTags: SetFieldValueFn<"tags">;
    isValid: boolean;
    getErrors: () => string[] | undefined;
    getWarnings: () => string[] | undefined;
    getIsChangingValue: () => boolean;
};
export type MetadataFormState = ReturnType<typeof useMetadataForm>;
export {};
