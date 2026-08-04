import { type ContentListItem } from '@kbn/content-list-provider';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import type { ContentEditorConfig } from './types';
/**
 * Builds the per-item callback for `features.contentEditor.open` by wrapping
 * `openContentEditor` (from `useOpenContentEditor()`) with the consumer's
 * {@link ContentEditorConfig}. Returns `undefined` when no config is supplied
 * so `<Action.ContentEditor />` self-skips.
 *
 * @internal Used by `ContentListClientProvider`.
 */
export declare const useContentEditorOpen: ({ contentEditor, openContentEditor, entityName, isReadOnly, queryKeyScope, }: {
    contentEditor?: ContentEditorConfig;
    openContentEditor: (params: OpenContentEditorParams) => () => void;
    entityName: string;
    isReadOnly?: boolean;
    queryKeyScope: string;
}) => ((item: ContentListItem) => void) | undefined;
