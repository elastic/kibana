/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/server';
// @ts-ignore untyped module
import numeralLanguages from '@elastic/numeral/languages';
import { FORMATS_UI_SETTINGS } from '../common';

// We add the `en` key manually here, since that's not a real numeral locale, but the
// default fallback in case the locale is not found.
const numeralLanguageIds = [
  'en',
  ...numeralLanguages.map((numeralLanguage: { id: string }) => {
    return numeralLanguage.id;
  }),
];

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    [FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE]: {
      name: i18n.translate('fieldFormats.advancedSettings.shortenFieldsTitle', {
        defaultMessage: 'Shorten fields',
      }),
      value: false,
      description: i18n.translate('fieldFormats.advancedSettings.shortenFieldsText', {
        defaultMessage: 'Shorten long fields, for example, instead of foo.bar.baz, show f.b.baz',
      }),
      schema: schema.boolean(),
    },
    [FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP]: {
      name: i18n.translate('fieldFormats.advancedSettings.format.defaultTypeMapTitle', {
        defaultMessage: 'Field type format name',
      }),
      value: `{
  "ip": { "id": "ip", "params": {} },
  "date": { "id": "date", "params": {} },
  "date_nanos": { "id": "date_nanos", "params": {}, "es": true },
  "geo_point": { "id": "geo_point", "params": { "transform": "wkt" } },
  "number": { "id": "number", "params": {} },
  "boolean": { "id": "boolean", "params": {} },
  "histogram": { "id": "histogram", "params": {} },
  "_source": { "id": "_source", "params": {} },
  "_default_": { "id": "string", "params": {} }
}`,
      type: 'json',
      description: i18n.translate('fieldFormats.advancedSettings.format.defaultTypeMapText', {
        defaultMessage:
          'Map of the format name to use by default for each field type. ' +
          '{defaultFormat} is used if the field type is not mentioned explicitly',
        values: {
          defaultFormat: '"_default_"',
        },
      }),
      schema: schema.object({
        ip: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        date: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        date_nanos: schema.object({
          id: schema.string(),
          params: schema.object({}),
          es: schema.boolean(),
        }),
        geo_point: schema.object({
          id: schema.string(),
          params: schema.object({
            transform: schema.string(),
          }),
        }),
        number: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        boolean: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        histogram: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        _source: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        _default_: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
      }),
    },
    [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: {
      name: i18n.translate('fieldFormats.advancedSettings.format.numberFormatTitle', {
        defaultMessage: 'Number format',
      }),
      value: '0,0.[000]',
      type: 'string',
      description: i18n.translate('fieldFormats.advancedSettings.format.numberFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "number" format',
        description:
          'Part of composite text: fieldFormats.advancedSettings.format.numberFormatText + ' +
          'fieldFormats.advancedSettings.format.numberFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="https://www.elastic.co/guide/en/kibana/current/numeral.html" target="_blank" rel="noopener">' +
            i18n.translate(
              'fieldFormats.advancedSettings.format.numberFormat.numeralFormatLinkText',
              {
                defaultMessage: 'numeral format',
              }
            ) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    [FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: {
      name: i18n.translate('fieldFormats.advancedSettings.format.percentFormatTitle', {
        defaultMessage: 'Percent format',
      }),
      value: '0,0.[000]%',
      type: 'string',
      description: i18n.translate('fieldFormats.advancedSettings.format.percentFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "percent" format',
        description:
          'Part of composite text: fieldFormats.advancedSettings.format.percentFormatText + ' +
          'fieldFormats.advancedSettings.format.percentFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="https://www.elastic.co/guide/en/kibana/current/numeral.html" target="_blank" rel="noopener">' +
            i18n.translate(
              'fieldFormats.advancedSettings.format.percentFormat.numeralFormatLinkText',
              {
                defaultMessage: 'numeral format',
              }
            ) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: {
      name: i18n.translate('fieldFormats.advancedSettings.format.bytesFormatTitle', {
        defaultMessage: 'Bytes format',
      }),
      value: '0,0.[0]b',
      type: 'string',
      description: i18n.translate('fieldFormats.advancedSettings.format.bytesFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "bytes" format',
        description:
          'Part of composite text: fieldFormats.advancedSettings.format.bytesFormatText + ' +
          'fieldFormats.advancedSettings.format.bytesFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="https://www.elastic.co/guide/en/kibana/current/numeral.html" target="_blank" rel="noopener">' +
            i18n.translate(
              'fieldFormats.advancedSettings.format.bytesFormat.numeralFormatLinkText',
              {
                defaultMessage: 'numeral format',
              }
            ) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    [FORMATS_UI_SETTINGS.FORMAT_CURRENCY_DEFAULT_PATTERN]: {
      name: i18n.translate('fieldFormats.advancedSettings.format.currencyFormatTitle', {
        defaultMessage: 'Currency format',
      }),
      value: '($0,0.[00])',
      type: 'string',
      description: i18n.translate('fieldFormats.advancedSettings.format.currencyFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "currency" format',
        description:
          'Part of composite text: fieldFormats.advancedSettings.format.currencyFormatText + ' +
          'fieldFormats.advancedSettings.format.currencyFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="https://www.elastic.co/guide/en/kibana/current/numeral.html" target="_blank" rel="noopener">' +
            i18n.translate(
              'fieldFormats.advancedSettings.format.currencyFormat.numeralFormatLinkText',
              {
                defaultMessage: 'numeral format',
              }
            ) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE]: {
      name: i18n.translate('fieldFormats.advancedSettings.format.formattingLocaleTitle', {
        defaultMessage: 'Formatting locale',
      }),
      value: 'en',
      type: 'select',
      options: numeralLanguageIds,
      optionLabels: Object.fromEntries(
        numeralLanguages.map((language: { id: string; name: string }) => [
          language.id,
          language.name,
        ])
      ),
      description: i18n.translate('fieldFormats.advancedSettings.format.formattingLocaleText', {
        defaultMessage: `{numeralLanguageLink} locale`,
        description:
          'Part of composite text: fieldFormats.advancedSettings.format.formattingLocale.numeralLanguageLinkText + ' +
          'fieldFormats.advancedSettings.format.formattingLocaleText',
        values: {
          numeralLanguageLink:
            '<a href="https://www.elastic.co/guide/en/kibana/current/numeral.html" target="_blank" rel="noopener">' +
            i18n.translate(
              'fieldFormats.advancedSettings.format.formattingLocale.numeralLanguageLinkText',
              {
                defaultMessage: 'Numeral language',
              }
            ) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
  };
}
