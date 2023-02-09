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
    defaultMessage: 'Add exceptions to this list',
  }
);

export const EMPTY_VIEWER_STATE_EMPTY_BODY = i18n.translate(
  'exceptionList-components.empty.viewer.state.empty.body',
  {
    defaultMessage: 'There is no exception in your list. Create your first exception.',
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
export const EXCEPTION_LIST_HEADER_EXPORT_ACTION = i18n.translate(
  'exceptionList-components.exception_list_header_export_action',
  {
    defaultMessage: 'Export exception list',
  }
);
export const EXCEPTION_LIST_HEADER_DELETE_ACTION = i18n.translate(
  'exceptionList-components.exception_list_header_delete_action',
  {
    defaultMessage: 'Delete exception list',
  }
);
export const EXCEPTION_LIST_HEADER_MANAGE_RULES_BUTTON = i18n.translate(
  'exceptionList-components.exception_list_header_manage_rules_button',
  {
    defaultMessage: 'Manage rules',
  }
);

export const EXCEPTION_LIST_HEADER_LINKED_RULES = (noOfRules: number) =>
  i18n.translate('exceptionList-components.exception_list_header_linked_rules', {
    values: { noOfRules },
    defaultMessage: 'Linked to {noOfRules} rules',
  });

export const EXCEPTION_LIST_HEADER_BREADCRUMB = i18n.translate(
  'exceptionList-components.exception_list_header_breadcrumb',
  {
    defaultMessage: 'Rule exceptions',
  }
);

export const EXCEPTION_LIST_HEADER_LIST_ID = i18n.translate(
  'exceptionList-components.exception_list_header_list_id',
  {
    defaultMessage: 'List ID',
  }
);

export const EXCEPTION_LIST_HEADER_NAME = i18n.translate(
  'exceptionList-components.exception_list_header_name',
  {
    defaultMessage: 'Add a name',
  }
);

export const EXCEPTION_LIST_HEADER_DESCRIPTION = i18n.translate(
  'exceptionList-components.exception_list_header_description',
  {
    defaultMessage: 'Add a description',
  }
);

export const EXCEPTION_LIST_HEADER_EDIT_MODAL_TITLE = (listName: string) =>
  i18n.translate('exceptionList-components.exception_list_header_edit_modal_name', {
    defaultMessage: 'Edit {listName}',
    values: { listName },
  });

export const EXCEPTION_LIST_HEADER_EDIT_MODAL_SAVE_BUTTON = i18n.translate(
  'exceptionList-components.exception_list_header_edit_modal_save_button',
  {
    defaultMessage: 'Save',
  }
);

export const EXCEPTION_LIST_HEADER_EDIT_MODAL_CANCEL_BUTTON = i18n.translate(
  'exceptionList-components.exception_list_header_edit_modal_cancel_button',
  {
    defaultMessage: 'Cancel',
  }
);
export const EXCEPTION_LIST_HEADER_NAME_TEXTBOX = i18n.translate(
  'exceptionList-components.exception_list_header_Name_textbox',
  {
    defaultMessage: 'Name',
  }
);

export const EXCEPTION_LIST_HEADER_DESCRIPTION_TEXTBOX = i18n.translate(
  'exceptionList-components.exception_list_header_description_textbox',
  {
    defaultMessage: 'Description (optional)',
  }
);

export const LIST_NAME_REQUIRED_ERROR = i18n.translate(
  'exceptionList-components.exception_list_header_description_textboxexceptionList-components.exception_list_header_name_required_eror',
  {
    defaultMessage: 'List name cannot be empty',
  }
);
