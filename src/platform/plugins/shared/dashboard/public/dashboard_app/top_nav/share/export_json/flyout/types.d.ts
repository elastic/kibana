export type ExportJsonStatus = 'loading' | 'success' | 'error';
export interface ExportJsonSharingData<State extends object> {
    title: string;
    getExportJson: (forceExportByValue?: boolean) => State;
}
export interface ExportJsonSanitizedState<SanitizedState extends object> {
    status: ExportJsonStatus;
    data: SanitizedState | undefined;
    warnings: string[];
    error: Error | undefined;
}
export type SanitizeStateFunction<State extends object, SanitizedState extends object> = (state: State) => Promise<{
    data: SanitizedState | undefined;
    warnings: Array<{
        message: string;
    }>;
}>;
