/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A service providing data information. Typically used for handling of empty state..
 */
export interface SharedUxDataService {
  /** True if the cluster contains data, false otherwise. */
  hasESData: () => Promise<boolean>;
  /** True if Kibana instance contains user-created data view, false otherwise. */
  hasUserDataView: () => Promise<boolean>;
  /** True if Kibana instance contains any data view, including system-created ones. */
  hasDataView: () => Promise<boolean>;
}
