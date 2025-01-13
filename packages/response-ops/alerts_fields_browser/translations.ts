/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const CASES = i18n.translate('responseOpsAlertsFieldsBrowser.cases.label', {
  defaultMessage: 'Cases',
});

export const MAINTENANCE_WINDOWS = i18n.translate(
  'responseOpsAlertsFieldsBrowser.maintenanceWindows.label',
  {
    defaultMessage: 'Maintenance Windows',
  }
);

export const CATEGORY = i18n.translate('responseOpsAlertsFieldsBrowser.categoryLabel', {
  defaultMessage: 'Category',
});

export const CATEGORIES = i18n.translate('responseOpsAlertsFieldsBrowser.categoriesTitle', {
  defaultMessage: 'Categories',
});

export const CATEGORIES_COUNT = (totalCount: number) =>
  i18n.translate('responseOpsAlertsFieldsBrowser.categoriesCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount} {totalCount, plural, =1 {category} other {categories}}',
  });

export const CLOSE = i18n.translate('responseOpsAlertsFieldsBrowser.closeButton', {
  defaultMessage: 'Close',
});

export const FIELDS_BROWSER = i18n.translate('responseOpsAlertsFieldsBrowser.fieldBrowserTitle', {
  defaultMessage: 'Fields',
});

export const DESCRIPTION = i18n.translate('responseOpsAlertsFieldsBrowser.descriptionLabel', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_FOR_FIELD = (field: string) =>
  i18n.translate('responseOpsAlertsFieldsBrowser.descriptionForScreenReaderOnly', {
    values: {
      field,
    },
    defaultMessage: 'Description for field {field}:',
  });

export const NAME = i18n.translate('responseOpsAlertsFieldsBrowser.fieldName', {
  defaultMessage: 'Name',
});

export const FIELD = i18n.translate('responseOpsAlertsFieldsBrowser.fieldLabel', {
  defaultMessage: 'Field',
});

export const FIELDS = i18n.translate('responseOpsAlertsFieldsBrowser.fieldsTitle', {
  defaultMessage: 'Fields',
});

export const FIELDS_SHOWING = i18n.translate('responseOpsAlertsFieldsBrowser.fieldsCountShowing', {
  defaultMessage: 'Showing',
});

export const FIELDS_COUNT = (totalCount: number) =>
  i18n.translate('responseOpsAlertsFieldsBrowser.fieldsCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount, plural, =1 {field} other {fields}}',
  });

export const FILTER_PLACEHOLDER = i18n.translate(
  'responseOpsAlertsFieldsBrowser.filterPlaceholder',
  {
    defaultMessage: 'Field name',
  }
);

export const NO_FIELDS_MATCH = i18n.translate('responseOpsAlertsFieldsBrowser.noFieldsMatchLabel', {
  defaultMessage: 'No fields match',
});

export const NO_FIELDS_MATCH_INPUT = (searchInput: string) =>
  i18n.translate('responseOpsAlertsFieldsBrowser.noFieldsMatchInputLabel', {
    defaultMessage: 'No fields match {searchInput}',
    values: {
      searchInput,
    },
  });

export const RESET_FIELDS = i18n.translate('responseOpsAlertsFieldsBrowser.resetFieldsLink', {
  defaultMessage: 'Reset Fields',
});

export const VIEW_COLUMN = (field: string) =>
  i18n.translate('responseOpsAlertsFieldsBrowser.viewColumnCheckboxAriaLabel', {
    values: { field },
    defaultMessage: 'View {field} column',
  });

export const VIEW_LABEL = i18n.translate('responseOpsAlertsFieldsBrowser.viewLabel', {
  defaultMessage: 'View',
});

export const VIEW_VALUE_SELECTED = i18n.translate('responseOpsAlertsFieldsBrowser.viewSelected', {
  defaultMessage: 'selected',
});

export const VIEW_VALUE_ALL = i18n.translate('responseOpsAlertsFieldsBrowser.viewAll', {
  defaultMessage: 'all',
});
