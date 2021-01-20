/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const capabilitiesProvider = () => ({
  management: {
    /*
     * Management settings correspond to management section/link ids, and should not be changed
     * without also updating those definitions.
     */
    kibana: {
      settings: true,
      indexPatterns: true,
      objects: true,
    },
  },
});
