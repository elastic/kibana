/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isKibanaResponse } from './response';

describe('isKibanaResponse', () => {
  it('expects the status to be a number', () => {
    expect(
      isKibanaResponse({
        status: 200,
        options: {},
      })
    ).toEqual(true);

    expect(
      isKibanaResponse({
        status: '200',
        options: {},
      })
    ).toEqual(false);
  });

  it('expects the options to be an object', () => {
    expect(
      isKibanaResponse({
        status: 200,
        options: {},
      })
    ).toEqual(true);

    expect(
      isKibanaResponse({
        status: 200,
        options: [],
      })
    ).toEqual(false);
    expect(
      isKibanaResponse({
        status: 200,
        options: null,
      })
    ).toEqual(false);
    expect(
      isKibanaResponse({
        status: 200,
        options: 'a string',
      })
    ).toEqual(false);
    expect(
      isKibanaResponse({
        status: 200,
        options: new Set(),
      })
    ).toEqual(false);
    expect(
      isKibanaResponse({
        status: 200,
        options: () => {},
      })
    ).toEqual(false);
  });

  it('allows a payload but no other properties', () => {
    expect(
      isKibanaResponse({
        status: 200,
        options: {},
        payload: 'My stuff',
      })
    ).toEqual(true);

    expect(
      isKibanaResponse({
        status: 200,
        options: {},
        data: 'Not allowed',
      })
    ).toEqual(false);
  });

  it('handles undefined inputs', () => {
    expect(isKibanaResponse(undefined)).toEqual(false);
  });
});
