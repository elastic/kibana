declare module "init-monaco" {
    import Monaco from "monaco-editor";


    export * from "monaco-editor"

    export function initMonaco(
        callback: (monaco: typeof Monaco) => void
    ): any;

}