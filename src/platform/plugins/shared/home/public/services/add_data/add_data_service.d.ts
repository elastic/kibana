/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
