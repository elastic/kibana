import { QuerySource } from '@kbn/esql-types';
import type { EsqlEditorActions } from '../editor_actions_context';
import type { EsqlStarredQueriesService } from '../editor_footer/esql_starred_queries_service';
interface UseEsqlEditorActionsParams {
    code: string;
    isHistoryOpen: boolean;
    isCurrentQueryStarred: boolean;
    onUpdateAndSubmitQuery: (newQuery: string, source: QuerySource) => void;
    onVisorClosed?: () => void;
    starredQueriesService: EsqlStarredQueriesService | null;
    trimmedQuery: string;
    isVisorOpenRef: React.MutableRefObject<boolean>;
    setIsHistoryOpen: (value: boolean) => void;
    setIsCurrentQueryStarred: (value: boolean) => void;
    setIsVisorOpen: (value: boolean) => void;
    trackQueryHistoryOpened: (isOpen: boolean) => void;
}
export declare function useEsqlEditorActions({ code, isHistoryOpen, isCurrentQueryStarred, onUpdateAndSubmitQuery, onVisorClosed, starredQueriesService, trimmedQuery, isVisorOpenRef, setIsHistoryOpen, setIsCurrentQueryStarred, setIsVisorOpen, trackQueryHistoryOpened, }: UseEsqlEditorActionsParams): {
    editorActions: EsqlEditorActions;
    onClickQueryHistory: (isOpen: boolean) => void;
    onSubmitEsqlQuery: (queryString: string) => void;
    onToggleHistory: () => void;
    onToggleStarredQuery: () => Promise<void>;
    onToggleVisor: () => void;
};
export {};
