/** @public */
export interface AddDataTab {
    id: string;
    name: string;
    getComponent: () => JSX.Element;
}
/** @public */
export interface CloudConnectStatusResult {
    isCloudConnected: boolean;
    isLoading: boolean;
}
/** @public */
export type CloudConnectStatusHook = () => CloudConnectStatusResult;
export declare class AddDataService {
    private addDataTabs;
    private cloudConnectStatusHook;
    setup(): {
        /**
         * Registers a component that will be rendered as a new tab in the Add data page
         */
        registerAddDataTab: (tab: AddDataTab) => void;
        /**
         * Registers a hook that returns the cloud connect status.
         * Used by the cloud_connect plugin to provide connection status to the home page.
         */
        registerCloudConnectStatusHook: (hook: CloudConnectStatusHook) => void;
    };
    getAddDataTabs(): AddDataTab[];
    getCloudConnectStatusHook(): CloudConnectStatusHook;
}
export type AddDataServiceSetup = ReturnType<AddDataService['setup']>;
