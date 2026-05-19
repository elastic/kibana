import { type Observable } from 'rxjs';
/**
 * Some EUI component can be toggled in Full screen (e.g. the EuiDataGrid). When they are toggled in full
 * screen we want to hide the chrome, and when they are toggled back to normal we want to show the chrome.
 * @internal
 */
export declare function handleEuiFullScreenChanges({ isVisible$, stop$, setIsVisible, }: {
    isVisible$: Observable<boolean>;
    stop$: Observable<void>;
    setIsVisible: (isVisible: boolean) => void;
}): void;
