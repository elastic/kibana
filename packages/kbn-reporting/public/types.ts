/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ClientConfigType {
  csv: {
    enablePanelActionDownload: boolean;
    scroll: {
      duration: string;
      size: number;
    };
  };
  poll: {
    jobsRefresh: {
      interval: number;
      intervalErrorMultiplier: number;
    };
  };
  roles: { enabled: boolean };
  export_types: {
    pdf: { enabled: boolean };
    png: { enabled: boolean };
    csv: { enabled: boolean };
  };
  statefulSettings: { enabled: boolean };
}
