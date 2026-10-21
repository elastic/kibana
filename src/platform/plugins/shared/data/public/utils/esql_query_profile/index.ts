/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { InspectorViewDescription } from '@kbn/inspector-plugin/public';
import type { ISearchStart } from '../../search';
import { hasEsqlInspectorRequest } from './is_esql_inspector_request';
import { getQueryProfileViewComponent } from './query_profile_view_wrapper';
import { ESQL_QUERY_PROFILE_VIEW_ID } from './view_id';

export { ESQL_QUERY_PROFILE_VIEW_ID } from './view_id';

/** Inspector view that re-runs a logged ES|QL request with `profile: true`. */
export const getEsqlQueryProfileViewDescription = (
  getStartServices: () => { search: ISearchStart }
): InspectorViewDescription => ({
  id: ESQL_QUERY_PROFILE_VIEW_ID,
  title: i18n.translate('data.inspector.queryProfile.queryProfileTitle', {
    defaultMessage: 'Query profile',
  }),
  order: 30,
  help: i18n.translate('data.inspector.queryProfile.queryProfileTooltip', {
    defaultMessage: 'Re-run an ES|QL request and see where the time went',
  }),
  shouldShow: hasEsqlInspectorRequest,
  component: getQueryProfileViewComponent(getStartServices),
});
