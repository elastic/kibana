import { monaco } from './monaco_imports';
export declare const DEFAULT_WORKER_ID: "default";
declare const langSpecificWorkerIds: readonly [string, "xjson", "painless", "yaml", "console"];
export type LangSpecificWorkerIds = [typeof DEFAULT_WORKER_ID, ...typeof langSpecificWorkerIds];
declare module 'monaco-editor/esm/vs/editor/editor.api' {
    interface Environment {
        monaco: typeof monaco;
    }
}
export {};
