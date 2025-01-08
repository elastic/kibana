/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

i18n.translate('Multiple_Binary_strings_with_No_Substitution_Template_Literal', {
  defaultMessage:
    '{objectCount, plural, one {# object} other {# objects}} with unknown types {objectCount, plural, one {was} other {were}} found in Kibana system indices. ' +
    'Upgrading with unknown savedObject types is no longer supported. ' +
    `To ensure that upgrades will succeed in the future, either re-enable plugins or delete these documents from the Kibana indices`,
  values: {
    objectCount: 13,
  },
});

i18n.translate('more_than_3_No_Substitution_Template_Literals', {
  defaultMessage:
    `The UI theme that the Kibana UI should use. ` +
    `Set to 'enabled' or 'disabled' to enable or disable the dark theme. ` +
    `Set to 'system' to have the Kibana UI theme follow the system theme. ` +
    `A page refresh is required for the setting to be applied.`,
});
