/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocLinksServiceSetup, UiSettingsParams } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { UI_SETTINGS } from '../common/constants';

export function getUiSettings(
  docLinks: DocLinksServiceSetup
): Record<string, UiSettingsParams<unknown>> {
  return {
    [UI_SETTINGS.AUTOCOMPLETE_VALUE_SUGGESTION_METHOD]: {
      name: i18n.translate('data.advancedSettings.autocompleteValueSuggestionMethod', {
        defaultMessage: 'Autocomplete value suggestion method',
      }),
      type: 'select',
      value: 'terms_enum',
      description: i18n.translate('data.advancedSettings.autocompleteValueSuggestionMethodText', {
        defaultMessage:
          'The method used for querying suggestions for values in KQL autocomplete. Select terms_enum to use the ' +
          'Elasticsearch terms enum API for improved autocomplete suggestion performance. Select terms_agg to use an ' +
          'Elasticsearch terms aggregation. {learnMoreLink}',
        values: {
          learnMoreLink:
            `<a href=${docLinks.links.kibana.autocompleteSuggestions} target="_blank" rel="noopener">` +
            i18n.translate('data.advancedSettings.autocompleteValueSuggestionMethodLink', {
              defaultMessage: 'Learn more.',
            }) +
            '</a>',
        },
      }),
      options: ['terms_enum', 'terms_agg'],
      category: ['autocomplete'],
      schema: schema.string(),
    },
    [UI_SETTINGS.AUTOCOMPLETE_USE_TIMERANGE]: {
      name: i18n.translate('data.advancedSettings.autocompleteIgnoreTimerange', {
        defaultMessage: 'Use time range',
        description: 'Restrict autocomplete results to the current time range',
      }),
      value: true,
      description: i18n.translate('data.advancedSettings.autocompleteIgnoreTimerangeText', {
        defaultMessage:
          'Disable this property to get autocomplete suggestions from your full dataset, rather than from the current time range. {learnMoreLink}',
        values: {
          learnMoreLink:
            `<a href=${docLinks.links.kibana.autocompleteSuggestions} target="_blank" rel="noopener">` +
            i18n.translate('data.advancedSettings.autocompleteValueSuggestionMethodLearnMoreLink', {
              defaultMessage: 'Learn more.',
            }) +
            '</a>',
        },
      }),
      category: ['autocomplete'],
      schema: schema.boolean(),
    },
  };
}
