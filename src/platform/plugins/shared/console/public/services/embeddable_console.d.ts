import type { Dispatch } from 'react';
import type { EmbeddedConsoleAction as EmbeddableConsoleAction, EmbeddedConsoleView } from '../types/embeddable_console';
import type { Storage } from '.';
export declare class EmbeddableConsoleInfo {
    private readonly storage;
    private _dispatch;
    private _alternateView;
    constructor(storage: Storage);
    get alternateView(): EmbeddedConsoleView | undefined;
    setDispatch(d: Dispatch<EmbeddableConsoleAction> | null): void;
    isEmbeddedConsoleAvailable(): boolean;
    openEmbeddedConsole(content?: string): void;
    openEmbeddedConsoleAlternateView(): void;
    registerAlternateView(view: EmbeddedConsoleView | null): void;
    getConsoleHeight(): string | undefined;
    setConsoleHeight(value: string): void;
}
