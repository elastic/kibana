/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';

export const inlineSpec: DataViewSpec = {
  title: 'logs-*',
  timeFieldName: '@timestamp',
  runtimeFieldMap: {
    bytes_runtime: { type: 'long', script: { source: 'emit(doc["bytes"].value)' } },
  },
};

export const inlineDataViewIdCases: Array<[string, DataViewSpec, string]> = [
  [
    'a primitive runtime field',
    inlineSpec,
    'discover-inline-6304de431ceaf4f5d9a8c49b99c634ec13a2a8a028c596c2c1d7940d8ef40731',
  ],
  [
    'a composite runtime field',
    {
      ...inlineSpec,
      runtimeFieldMap: {
        bytes_runtime: {
          type: 'composite',
          script: { source: 'emit("value", doc["bytes"].value)' },
          fields: { value: { type: 'long' } },
        },
      },
    },
    'discover-inline-0ee83246d4554f45102127fe37796b40d39d1f3258f85a796b4adb078149bf5f',
  ],
  [
    'a number format',
    {
      ...inlineSpec,
      fieldFormats: { bytes: { id: 'number', params: { pattern: '0,0.00' } } },
    },
    'discover-inline-59bac35898e18373ba40ed42299867f5cc4bbd59e281126230b8c9319bcf045c',
  ],
  [
    'a duration format with zero precision and no suffix',
    {
      ...inlineSpec,
      fieldFormats: {
        bytes: {
          id: 'duration',
          params: {
            inputFormat: 'milliseconds',
            outputFormat: 'asSeconds',
            outputPrecision: 0,
            showSuffix: false,
          },
        },
      },
    },
    'discover-inline-703b5855ffb74a03c3b5ec9da1d3f2b2dc9cbcc39ac101730ed8499152331b1f',
  ],
  [
    'a color format',
    {
      ...inlineSpec,
      fieldFormats: {
        bytes: {
          id: 'color',
          params: {
            fieldType: 'number',
            colors: [{ range: '0:100', text: '#111111', background: '#eeeeee' }],
          },
        },
      },
    },
    'discover-inline-51e4f98b0ce22bdf721af6aa4a1b7221a0b5bf6945adbddacaa297a09b08e22d',
  ],
  [
    'a URL format',
    {
      ...inlineSpec,
      fieldFormats: {
        bytes: {
          id: 'url',
          params: {
            type: 'img',
            urlTemplate: 'https://example.test/{{value}}',
            labelTemplate: 'Image',
            width: 100,
            height: 50,
          },
        },
      },
    },
    'discover-inline-2a2df327f10309d7918aa9c58352465be3d083b5f4382b85e232a633db9bedf2',
  ],
  [
    'a static lookup format',
    {
      ...inlineSpec,
      fieldFormats: {
        bytes: {
          id: 'static_lookup',
          params: {
            lookupEntries: [{ key: '100', value: 'Small' }],
            unknownKeyValue: 'Other',
          },
        },
      },
    },
    'discover-inline-0fe73c705cb17a6cdd37f3c54677f4b9dc6fd239922183e74526677dabea524c',
  ],
  [
    'a histogram format',
    {
      ...inlineSpec,
      fieldFormats: {
        bytes: { id: 'histogram', params: { id: 'number', params: { pattern: '0.00' } } },
      },
    },
    'discover-inline-1db9ecd4b3ab902015fecc907c3f7fd113589a9b7abab67c59efe733bba3e423',
  ],
  [
    'a custom label and description',
    {
      ...inlineSpec,
      fieldAttrs: {
        bytes: { customLabel: 'Bytes transferred', customDescription: 'Response size' },
      },
    },
    'discover-inline-ed34f951d4f1a02601f1306e67e8567cd5213cd29087d2e28cef315b461f7258',
  ],
  [
    'field filters',
    { ...inlineSpec, sourceFilters: [{ value: 'secret.*' }, { value: 'internal.*' }] },
    'discover-inline-6115eb9c87e425787e5b8bd53240a4a736d699fefa9635bc6a10cde567b5c951',
  ],
  [
    'popularity without display overrides',
    { ...inlineSpec, fieldAttrs: { bytes: { count: 3 } } },
    'discover-inline-6304de431ceaf4f5d9a8c49b99c634ec13a2a8a028c596c2c1d7940d8ef40731',
  ],
  [
    'empty field settings',
    { ...inlineSpec, fieldAttrs: { bytes: {} } },
    'discover-inline-6304de431ceaf4f5d9a8c49b99c634ec13a2a8a028c596c2c1d7940d8ef40731',
  ],
  [
    'explicit Data View defaults',
    {
      ...inlineSpec,
      name: 'logs-*',
      allowHidden: false,
      sourceFilters: [],
      fieldFormats: {},
      fieldAttrs: {},
    },
    'discover-inline-6304de431ceaf4f5d9a8c49b99c634ec13a2a8a028c596c2c1d7940d8ef40731',
  ],
  [
    'omitted format defaults',
    {
      ...inlineSpec,
      fieldFormats: { bytes: { id: 'duration' }, '@timestamp': { id: 'url' } },
    },
    'discover-inline-0dce78d4709b8fcf21b18ce428e91baf38b79c92c2f95ffc93383070fa5f47e3',
  ],
  [
    'explicit format defaults',
    {
      ...inlineSpec,
      fieldFormats: {
        bytes: {
          id: 'duration',
          params: { inputFormat: 'seconds', outputFormat: 'humanize' },
        },
        '@timestamp': { id: 'url', params: { type: 'a' } },
      },
    },
    'discover-inline-0dce78d4709b8fcf21b18ce428e91baf38b79c92c2f95ffc93383070fa5f47e3',
  ],
];
