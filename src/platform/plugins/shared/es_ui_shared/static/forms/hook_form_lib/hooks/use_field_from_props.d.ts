import type { UseFieldProps } from '../components';
import type { FieldHook } from '../types';
/**
 * Hook to initialize a FieldHook based on Props passed to <UseField /> or <UseMultiFields />
 *
 * @param props The props passed to <UseField /> or <UseMultiFields />
 * @returns The field hook and props to forward to component to render for the field
 */
export declare const useFieldFromProps: <T, FormType, I>(props: UseFieldProps<T, FormType, I>) => {
    field: FieldHook<T, I>;
    propsToForward: {
        [x: string]: unknown;
    };
};
