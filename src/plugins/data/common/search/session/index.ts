
export type ISessionService = {
    get: () => string | undefined;
    restore: (sessionId: string) => void;
    start: () => void;
    clear: () => void;
};