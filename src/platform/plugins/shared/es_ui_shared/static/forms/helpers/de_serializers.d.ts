import type { EuiSelectableOption } from '@elastic/eui';
import type { SerializerFunc } from '../hook_form_lib';
type FuncType = (selectOptions: EuiSelectableOption[]) => SerializerFunc;
export declare const multiSelectComponent: Record<string, FuncType>;
export {};
