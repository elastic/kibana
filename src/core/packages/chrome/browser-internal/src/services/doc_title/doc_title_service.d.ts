import type { Observable } from 'rxjs';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';
export interface InternalChromeDocTitleSetup {
    title$: Observable<string>;
    titleParts$: Observable<readonly string[]>;
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
    private titlePartsSubject;
    setup({ document }: SetupDeps): InternalChromeDocTitleSetup;
    start(): ChromeDocTitle;
    private applyTitle;
    private getTitleParts;
}
export {};
