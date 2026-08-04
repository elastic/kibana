import type { ContentEditorActionProps, ActionOutput, ActionBuilderContext } from '../types';
/**
 * Builds the "view details" action preset, returning `undefined` to skip when
 * `context.features.contentEditor.open` isn't wired.
 */
export declare const buildContentEditorAction: (attributes: ContentEditorActionProps, context: ActionBuilderContext) => ActionOutput | undefined;
