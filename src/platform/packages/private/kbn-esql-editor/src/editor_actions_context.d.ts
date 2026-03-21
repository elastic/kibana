import React from 'react';
export interface EsqlEditorActions {
    toggleVisor: () => void;
    toggleHistory: () => void;
    toggleStarredQuery: () => void;
    submitEsqlQuery: (query: string) => void;
    isHistoryOpen: boolean;
    isCurrentQueryStarred: boolean;
    canToggleStarredQuery: boolean;
    currentQuery: string;
}
export declare function EsqlEditorActionsProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useEsqlEditorActions(): EsqlEditorActions | null;
export declare function useHasEsqlEditorActionsProvider(): boolean;
export declare function useEsqlEditorActionsRegistration(actions: EsqlEditorActions | null): void;
