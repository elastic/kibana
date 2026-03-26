/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TrackContentfulRender {
  /**
   * A way to report that the contentful render has been completed
   */
  trackContentfulRender: () => void;
}

export const canTrackContentfulRender = (root: unknown): root is TrackContentfulRender => {
  return root !== null && typeof root === 'object' && 'trackContentfulRender' in root;
};
