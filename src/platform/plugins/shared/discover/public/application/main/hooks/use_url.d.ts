import type { History } from 'history';
export declare function useUrl({ history, savedSearchId, onNewUrl: currentOnNewUrl, }: {
    history: History;
    savedSearchId: string | undefined;
    onNewUrl: () => void;
}): void;
