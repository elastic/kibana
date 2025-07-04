/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  escapedFormulaValuesMessage: i18n.translate('generateCsv.escapedFormulaValues', {
    defaultMessage: 'CSV may contain formulas whose values have been escaped',
  }),
  authenticationError: {
    partialResultsMessage: i18n.translate(
      'generateCsv.authenticationExpired.partialResultsMessage',
      {
        defaultMessage:
          'This report contains partial CSV results because the authentication token expired. Export a smaller amount of data or increase the timeout of the authentication token.',
      }
    ),
  },
  esErrorMessage: (statusCode: number, message: string) =>
    i18n.translate('generateCsv.esErrorMessage', {
      defaultMessage: 'Received a {statusCode} response from Elasticsearch: {message}',
      values: { statusCode, message },
    }),
  unknownError: (message: string = 'unknown') =>
    i18n.translate('generateCsv.unknownErrorMessage', {
      defaultMessage: 'Encountered an unknown error: {message}',
      values: { message },
    }),
  csvRowCountError: ({ expected, received }: { expected?: number; received: number }) =>
    i18n.translate('generateCsv.incorrectRowCount', {
      defaultMessage:
        'Encountered an error with the number of CSV rows generated from the search: expected {expected}, received {received}.',
      values: { expected, received },
    }),
  csvRowCountIndeterminable: ({ received }: { expected?: number; received: number }) =>
    i18n.translate('generateCsv.indeterminableRowCount', {
      defaultMessage:
        'Encountered an error with the number of CSV rows generated from the search: expected rows were indeterminable, received {received}.',
      values: { received },
    }),
  csvUnableToClosePit: () =>
    i18n.translate('generateCsv.csvUnableToClosePit', {
      defaultMessage:
        'Unable to close the Point-In-Time used for search. Check the Kibana server logs.',
    }),
  csvUnableToCloseScroll: () =>
    i18n.translate('generateCsv.csvUnableToCloseScroll', {
      defaultMessage:
        'Unable to close the scroll context used for search. Check the Kibana server logs.',
    }),
};
