import type { ScopedHistory, CoreStart } from '@kbn/core/public';
export declare const renderApp: (element: HTMLElement, coreStart: CoreStart, history: ScopedHistory) => Promise<() => void>;
