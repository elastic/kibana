import type { ApplicationStart, ScopedHistory, OverlayStart, HttpStart } from '@kbn/core/public';
interface BaseProps {
    hasUnsavedChanges: boolean;
}
interface SpaBlockingProps extends BaseProps {
    http: HttpStart;
    openConfirm: OverlayStart['openConfirm'];
    history: ScopedHistory;
    navigateToUrl: ApplicationStart['navigateToUrl'];
    titleText?: string;
    messageText?: string;
    cancelButtonText?: string;
    confirmButtonText?: string;
    blockSpaNavigation?: true;
    shouldPromptOnReplace?: boolean;
}
interface BrowserBlockingProps extends BaseProps {
    blockSpaNavigation: false;
    shouldPromptOnReplace?: boolean;
}
type Props = SpaBlockingProps | BrowserBlockingProps;
export declare const useUnsavedChangesPrompt: (props: Props) => void;
export {};
