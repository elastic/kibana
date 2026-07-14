import type { Observable } from 'rxjs';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';
export interface InternalChromeDocTitleSetup {
    title$: Observable<string>;
}
interface SetupDeps {
    document: {
        title: string;
    };
}
/** @internal */
export declare class DocTitleService {
    private document?;
    private baseTitle?;
    private titleSubject;
    setup({ document }: SetupDeps): InternalChromeDocTitleSetup;
    start(): ChromeDocTitle;
    private applyTitle;
    private render;
}
export {};
