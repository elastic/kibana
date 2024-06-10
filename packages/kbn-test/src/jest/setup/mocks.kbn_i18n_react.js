/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-env jest */

jest.mock('@kbn/i18n-react', () => {
  // We must initialize i18n before using the i18n Provider
  // This is an implementation detail for our package to ensure no re-renders needed
  // and to ensure that all i18n strings are being localized correctly.
  // This mock initializes i18n to save developers from doing so everytime
  // they need to mount their components with enzyme.

  const actual = jest.requireActual('@kbn/i18n-react');
  const { i18n } = jest.requireActual('@kbn/i18n');

  // if developers require custom messages for testing they can re-initialize i18n.
  i18n.init({ locale: 'en', messages: {} });

  return actual;
});
