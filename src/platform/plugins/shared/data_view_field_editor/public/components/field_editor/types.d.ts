import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { RuntimeType } from '../../shared_imports';
export type TypeSelection = Array<EuiComboBoxOptionOption<RuntimeType>>;
export interface FieldTypeInfo {
    name: string;
    type: string;
}
