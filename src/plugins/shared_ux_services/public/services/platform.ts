/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A services providing methods to interact with the Platform in which this plugin is
 * running, (almost always Kibana).
 *
 * Rather than provide the entire `CoreStart` contract to components, we provide simplified
 * abstractions around a use case specific to Shared UX.  This way, we know exactly how the
 * `CoreStart` and other plugins are used, like specifically which methods.  This makes
 * mocking and refactoring easier when upstream dependencies change.
 */
export interface SharedUXPlatformService {
  /**
   * Sets the fullscreen state of the chrome.
   */
  setIsFullscreen: (isFullscreen: boolean) => void;
}
