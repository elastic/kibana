import type { AggregateQuery } from '@kbn/es-query';
import type { IndexAutocompleteItem } from '@kbn/esql-types';
import type { EditLookupIndexContentContext } from '@kbn/index-editor';
import { monaco } from '@kbn/code-editor';
import type React from 'react';
import type { LookupIndexPrivileges } from './use_lookup_index_privileges';
/**
 * monaco editor command ID for opening the lookup index flyout.
 */
export declare const COMMAND_ID = "esql.lookup_index.create";
export interface IndexEditorCommandArgs {
    indexName: string;
    doesIndexExist?: boolean;
    canEditIndex?: boolean;
    triggerSource?: string;
    highestPrivilege?: string;
}
/**
 * Creates a command string for the lookup index badge in the ESQL editor.
 */
export declare function getMonacoCommandString(indexName: string, isExistingIndex: boolean, indexPrivileges: LookupIndexPrivileges): string | undefined;
/**
 * Hook to determine if the current user has the necessary privileges to create a lookup index.
 */
export declare const useCanCreateLookupIndex: () => (indexName: string) => Promise<boolean>;
/**
 * Hook to register a custom command and tokens for lookup indices in the ESQL editor.
 * @param editorRef
 * @param editorModel
 * @param getLookupIndices
 * @param query
 * @param onIndexCreated
 */
export declare const useLookupIndexCommand: (editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>, editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>, getLookupIndices: (() => Promise<{
    indices: IndexAutocompleteItem[];
}>) | undefined, query: AggregateQuery, onIndexCreated: (resultQuery: string) => Promise<void>, onNewFieldsAddedToIndex?: (indexName: string) => void, onOpenIndexInDiscover?: EditLookupIndexContentContext["onOpenIndexInDiscover"]) => {
    addLookupIndicesDecorator: import("lodash").DebouncedFunc<() => Promise<false | undefined>>;
    lookupIndexBadgeStyle: import("@emotion/react").SerializedStyles;
};
