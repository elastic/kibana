import React, { Component } from 'react';
import type { HttpStart, IBasePath } from '@kbn/core/public';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import { type EuiTablePersistInjectedProps } from '@kbn/shared-ux-table-persist';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import type { ProcessedImportResponse } from '../../../lib';
import type { FailedImportConflict, RetryDecision } from '../../../lib/resolve_import_errors';
import type { ImportMode } from './import_mode_control';
export interface FlyoutProps {
    close: () => void;
    done: () => void;
    newIndexPatternUrl: string;
    dataViews: DataViewsContract;
    http: HttpStart;
    basePath: IBasePath;
    search: ISearchStart;
    allowedTypes: SavedObjectManagementTypeInfo[];
    showPlainSpinner?: boolean;
}
export interface FlyoutState {
    unmatchedReferences?: ProcessedImportResponse['unmatchedReferences'];
    failedImports?: ProcessedImportResponse['failedImports'];
    successfulImports?: ProcessedImportResponse['successfulImports'];
    conflictingRecord?: ConflictingRecord;
    importWarnings?: ProcessedImportResponse['importWarnings'];
    error?: string;
    file?: File;
    importCount: number;
    indexPatterns?: DataView[];
    importMode: ImportMode;
    loadingMessage?: string;
    status: string;
}
interface ConflictingRecord {
    conflict: FailedImportConflict;
    done: (result: [boolean, string | undefined]) => void;
}
export declare class FlyoutClass extends Component<FlyoutProps & EuiTablePersistInjectedProps<any>, FlyoutState> {
    private flyoutTitleId;
    constructor(props: FlyoutProps & EuiTablePersistInjectedProps<unknown>);
    componentDidMount(): void;
    fetchIndexPatterns: () => Promise<void>;
    changeImportMode: (importMode: FlyoutState["importMode"]) => void;
    setImportFile: (files: FileList | null) => void;
    /**
     * Import
     *
     * Does the initial import of a file, resolveImportErrors then handles errors and retries
     */
    import: () => Promise<void>;
    /**
     * Get Conflict Resolutions
     *
     * Function iterates through the objects, displays a modal for each asking the user if they wish to overwrite it or not.
     *
     * @param {array} failures List of objects to request the user if they wish to overwrite it
     * @return {Promise<array>} An object with the key being "type:id" and value the resolution chosen by the user
     */
    getConflictResolutions: (failures: FailedImportConflict[]) => Promise<Record<string, RetryDecision>>;
    /**
     * Resolve Import Errors
     *
     * Function goes through the failedImports and tries to resolve the issues.
     */
    resolveImportErrors: () => Promise<void>;
    get hasUnmatchedReferences(): boolean | undefined;
    get resolutions(): {
        oldId: string;
        newId: string;
    }[];
    onIndexChanged: (id: string, e: any) => void;
    renderUnmatchedReferences(): React.JSX.Element | null;
    renderError(): React.JSX.Element | null;
    renderBody(): React.JSX.Element | null;
    renderFooter(): React.JSX.Element;
    renderSubheader(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export declare const Flyout: React.FC<import("@kbn/shared-ux-table-persist").HOCProps<any, Omit<FlyoutProps & EuiTablePersistInjectedProps<any>, "euiTablePersist">>>;
export {};
