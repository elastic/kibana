type ChangeDocTitleHandler = (newTitle: string | string[]) => void;
export declare class DocTitleService {
    private changeDocTitleHandler;
    setup(_changeDocTitleHandler: ChangeDocTitleHandler): void;
    setTitle(page: string): void;
}
export {};
