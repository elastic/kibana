import type { FC } from 'react';
import type { SavedObjectsImportSuccess, SavedObjectsImportWarning, IBasePath } from '@kbn/core/public';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import type { FailedImport } from '../../../lib';
export interface ImportSummaryProps {
    failedImports: FailedImport[];
    successfulImports: SavedObjectsImportSuccess[];
    importWarnings: SavedObjectsImportWarning[];
    basePath: IBasePath;
    allowedTypes: SavedObjectManagementTypeInfo[];
}
export declare const ImportSummary: FC<ImportSummaryProps>;
