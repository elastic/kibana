import type { DataView } from '@kbn/data-views-plugin/common';
interface UseCurrentTabMenuActionsParams {
    currentDataView: DataView | undefined;
}
export declare const useCurrentTabMenuActions: ({ currentDataView }: UseCurrentTabMenuActionsParams) => {
    canSwitchLanguageMode: any;
    isDataViewMode: boolean;
    openInspector: (onClose?: () => void) => void;
    switchLanguageMode: () => void;
};
export {};
