/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_VIEWER_STATE_EMPTY_TITLE = i18n.translate(
  'exceptionList-components.empty.viewer.state.empty.title',
  {
    defaultMessage: 'Add exceptions to this rule',
  }
);

export const EMPTY_VIEWER_STATE_EMPTY_BODY = i18n.translate(
  'exceptionList-components.empty.viewer.state.empty.body',
  {
    defaultMessage: 'There is no exception in your rule. Create your first rule exception.',
  }
);
export const EMPTY_VIEWER_STATE_EMPTY_SEARCH_TITLE = i18n.translate(
  'exceptionList-components.empty.viewer.state.empty_search.search.title',
  {
    defaultMessage: 'No results match your search criteria',
  }
);

export const EMPTY_VIEWER_STATE_EMPTY_SEARCH_BODY = i18n.translate(
  'exceptionList-components.empty.viewer.state.empty_search.body',
  {
    defaultMessage: 'Try modifying your search',
  }
);

export const EMPTY_VIEWER_STATE_EMPTY_VIEWER_BUTTON = (exceptionType: string) =>
  i18n.translate('exceptionList-components.empty.viewer.state.empty.viewer_button', {
    values: { exceptionType },
    defaultMessage: 'Create {exceptionType} exception',
  });

export const EMPTY_VIEWER_STATE_ERROR_TITLE = i18n.translate(
  'exceptionList-components.empty.viewer.state.error_title',
  {
    defaultMessage: 'Unable to load exception items',
  }
);

export const EMPTY_VIEWER_STATE_ERROR_BODY = i18n.translate(
  'exceptionList-components.empty.viewer.state.error_body',
  {
    defaultMessage:
      'There was an error loading the exception items. Contact your administrator for help.',
  }
);
