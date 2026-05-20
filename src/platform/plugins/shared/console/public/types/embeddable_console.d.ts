import type { ComponentType, MouseEventHandler } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { Dispatch } from 'react';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
export interface EmbeddableConsoleDependencies {
    core: CoreStart;
    data: DataPublicPluginStart;
    licensing: LicensingPluginStart;
    usageCollection?: UsageCollectionStart;
    setDispatch: (dispatch: Dispatch<EmbeddedConsoleAction> | null) => void;
    alternateView?: EmbeddedConsoleView;
    isDevMode: boolean;
    getConsoleHeight: () => string | undefined;
    setConsoleHeight: (value: string) => void;
}
export type EmbeddedConsoleAction = {
    type: 'open';
    payload?: {
        content?: string;
        alternateView?: boolean;
    };
} | {
    type: 'close';
};
export declare enum EmbeddableConsoleView {
    Closed = 0,
    Console = 1,
    Alternate = 2
}
export interface EmbeddedConsoleStore {
    consoleHasBeenOpened: boolean;
    view: EmbeddableConsoleView;
    loadFromContent?: string;
}
export interface EmbeddedConsoleViewButtonProps {
    activeView: boolean;
    onClick: MouseEventHandler<HTMLButtonElement>;
}
export interface EmbeddedConsoleView {
    ActivationButton: ComponentType<EmbeddedConsoleViewButtonProps>;
    ViewContent: ComponentType<{}>;
}
