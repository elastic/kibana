import type { ContentEditorFlyoutContentContainerProps } from './components';
export type OpenContentEditorParams = Pick<ContentEditorFlyoutContentContainerProps, 'item' | 'onSave' | 'isReadonly' | 'readonlyReason' | 'entityName' | 'customValidators' | 'appendRows'>;
export declare function useOpenContentEditor(): (args: OpenContentEditorParams) => () => void;
