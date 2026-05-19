import type { FunctionComponent } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { RootProfileProvider } from '../../../profiles';
import type { SecurityProfileProviderFactory } from '../types';
interface SecurityRootProfileContext {
    getSecuritySolutionCellRenderer?: (fieldName: string) => FunctionComponent<DataGridCellValueElementProps> | undefined;
}
export declare const createSecurityRootProfileProvider: SecurityProfileProviderFactory<RootProfileProvider<SecurityRootProfileContext>>;
export {};
