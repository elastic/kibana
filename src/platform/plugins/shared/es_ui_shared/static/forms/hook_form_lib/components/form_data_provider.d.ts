import type { FormData } from '../types';
interface Props<I> {
    children: (formData: I) => JSX.Element | null;
    pathsToWatch?: string | string[];
}
declare const FormDataProviderComp: <I extends FormData = FormData>({ children, pathsToWatch, }: Props<I>) => JSX.Element | null;
/**
 * Context provider to access the form data.
 * @deprecated Use the "useFormData()" hook instead
 */
export declare const FormDataProvider: typeof FormDataProviderComp;
export {};
