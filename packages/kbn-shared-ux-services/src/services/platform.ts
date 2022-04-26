/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A service providing methods to interact with the platform in which this code is
 * running, (almost always Kibana).
 *
 * Rather than provide the entire `CoreStart` contract to components, we provide simplified
 * abstractions around a use case specific to Shared UX.  This way, we know exactly how the
 * `CoreStart` and other plugins are used.  This makes mocking and refactoring easier when
 *  upstream dependencies change.
 */
export interface SharedUxPlatformService {
  /**
   * Sets the fullscreen state of the chrome.
   * @param isFullscreen True if the chrome should be fullscreen, false otherwise.
   */
  setIsFullscreen: (isFullscreen: boolean) => void;
}
