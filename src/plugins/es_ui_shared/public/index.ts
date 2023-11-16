/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Create a namespace for Forms
 * In the future, each top level folder should be exported like that to avoid naming collision
 */
import * as Forms from './forms';
import * as ace from './ace';
import * as GlobalFlyout from './global_flyout';
import * as XJson from './xjson';

export type { OnJsonEditorUpdateHandler, JsonEditorState } from './components/json_editor';
export { JsonEditor } from './components/json_editor';

export { PageLoading } from './components/page_loading';
export { SectionLoading } from './components/section_loading';

export type { Frequency } from './components/cron_editor';
export { CronEditor } from './components/cron_editor';
export { ViewApiRequestFlyout } from './components/view_api_request_flyout';

export type {
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
  UseRequestResponse,
} from './request';
export { sendRequest, useRequest } from './request';

export { indices } from './indices';

export type { Privileges, MissingPrivileges, Error, Authorization } from './authorization';
export {
  AuthorizationContext,
  AuthorizationProvider,
  NotAuthorizedSection,
  WithPrivileges,
  SectionError,
  PageError,
  useAuthorizationContext,
} from './authorization';

export { Forms, ace, GlobalFlyout, XJson };

export { extractQueryParams, attemptToURIDecode } from './url';

/** dummy plugin, we just want esUiShared to have its own bundle */
export function plugin() {
  return new (class EsUiSharedPlugin {
    setup() {}
    start() {}
  })();
}
