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

export class AddDataService {
  private addDataTabs: Record<string, AddDataTab> = {};

  public setup() {
    return {
      /**
       * Registers a component that will be rendered as a new tab in the Add data page
       */
      registerAddDataTab: (tab: AddDataTab) => {
        if (this.addDataTabs[tab.id]) {
          throw new Error(`Tab ${tab.id} already exists`);
        }
        this.addDataTabs[tab.id] = tab;
      },
    };
  }

  public getAddDataTabs() {
    return Object.values(this.addDataTabs);
  }
}

export type AddDataServiceSetup = ReturnType<AddDataService['setup']>;
