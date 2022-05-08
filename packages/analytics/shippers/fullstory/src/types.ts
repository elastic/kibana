/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Definition of the FullStory API.
 * Docs are available at https://developer.fullstory.com/.
 */
export interface FullStoryApi {
  /**
   * Identify a User
   * https://developer.fullstory.com/identify
   * @param userId
   * @param userVars
   */
  identify(userId: string, userVars?: Record<string, unknown>): void;

  /**
   * Set User Variables
   * https://developer.fullstory.com/user-variables
   * @param userVars
   */
  setUserVars(userVars: Record<string, unknown>): void;

  /**
   * Setting page variables
   * https://developer.fullstory.com/page-variables
   * @param scope
   * @param pageProperties
   */
  setVars(scope: 'page', pageProperties: Record<string, unknown>): void;

  /**
   * Sending custom event data into FullStory
   * https://developer.fullstory.com/custom-events
   * @param eventName
   * @param eventProperties
   */
  event(eventName: string, eventProperties: Record<string, unknown>): void;

  /**
   * Selectively record parts of your site based on explicit user consent
   * https://developer.fullstory.com/consent
   * @param isOptedIn true if the user has opted in to tracking
   */
  consent(isOptedIn: boolean): void;

  /**
   * Restart session recording after it has been shutdown
   * https://developer.fullstory.com/restart-recording
   */
  restart(): void;

  /**
   * Stop recording a session
   * https://developer.fullstory.com/stop-recording
   */
  shutdown(): void;
}

declare global {
  interface Window {
    _fs_debug: boolean;
    _fs_host: string;
    _fs_org: string;
    _fs_namespace: string;
    _fs_script: string;
    FS: FullStoryApi;
  }
}
