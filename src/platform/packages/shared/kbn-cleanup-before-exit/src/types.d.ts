export interface CleanupBeforeExitOptions {
    blockExit?: boolean;
    timeout?: number;
}
export type CleanupHandlerCallback = () => Promise<void> | void;
export interface CleanupHandler {
    fn: () => Promise<void>;
    blockExit: boolean;
}
