/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Create a namespace for Forms
 * In the future, each top level folder should be exported like that to avoid naming collision
 */
import * as Forms from './forms';
import * as ace from './ace';
import * as GlobalFlyout from './global_flyout';
import * as XJson from './xjson';

export { JsonEditor, OnJsonEditorUpdateHandler, JsonEditorState } from './components/json_editor';

export { SectionLoading } from './components/section_loading';

export { Frequency, CronEditor } from './components/cron_editor';

export {
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
  UseRequestResponse,
  sendRequest,
  useRequest,
} from './request';

export { indices } from './indices';

export {
  AuthorizationContext,
  AuthorizationProvider,
  NotAuthorizedSection,
  WithPrivileges,
  Privileges,
  MissingPrivileges,
  SectionError,
  Error,
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
