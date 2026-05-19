export declare function dispatchRenderComplete(el: HTMLElement): void;
export declare function dispatchRenderStart(el: HTMLElement): void;
/**
 * Should call `dispatchComplete()` when UI block has finished loading its data and has
 * completely rendered. Should `dispatchInProgress()` every time UI block
 * starts loading data again. At the start it is assumed that UI block is loading
 * so it dispatches "in progress" automatically, so you need to call `setRenderComplete`
 * at least once.
 *
 * This is used for reporting to know that UI block is ready, so
 * it can take a screenshot. It is also used in functional tests to know that
 * page has stabilized.
 */
export declare class RenderCompleteDispatcher {
    private count;
    private el?;
    constructor(el?: HTMLElement);
    setEl(el?: HTMLElement): void;
    dispatchInProgress(): void;
    dispatchComplete(): void;
    dispatchError(): void;
    setTitle(title: string): void;
}
