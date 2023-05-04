/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { removeSlashes } from './remove_slashes';

describe('removeSlashes', () => {
  it('only removes duplicates by default', () => {
    expect(removeSlashes('/some//url//to//')).toEqual('/some/url/to/');
    expect(removeSlashes('some/////other//url')).toEqual('some/other/url');
  });

  it('remove trailing slash when `trailing` is true', () => {
    expect(removeSlashes('/some//url//to//', { trailing: true })).toEqual('/some/url/to');
  });

  it('remove leading slash when `leading` is true', () => {
    expect(removeSlashes('/some//url//to//', { leading: true })).toEqual('some/url/to/');
  });

  it('does not removes duplicates when `duplicates` is false', () => {
    expect(removeSlashes('/some//url//to/', { leading: true, duplicates: false })).toEqual(
      'some//url//to/'
    );
    expect(removeSlashes('/some//url//to/', { trailing: true, duplicates: false })).toEqual(
      '/some//url//to'
    );
  });

  it('accept mixed options', () => {
    expect(
      removeSlashes('/some//url//to/', { leading: true, duplicates: false, trailing: true })
    ).toEqual('some//url//to');
    expect(
      removeSlashes('/some//url//to/', { leading: true, duplicates: true, trailing: true })
    ).toEqual('some/url/to');
  });
});
