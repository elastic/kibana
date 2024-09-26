/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeIframeTag } from './make_iframe_tag';

describe('makeIframeTag', () => {
  it('works for simple urls', () => {
    const url = 'http://localhost:5601/app/home#/';
    expect(makeIframeTag(url)).toBe(
      '<iframe src="http://localhost:5601/app/home#/?embed=true" height="600" width="800"></iframe>'
    );
  });

  it('works if the url has a query string', () => {
    const url =
      'http://localhost:5601/app/dashboards#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-7d%2Fd,to:now))';
    expect(makeIframeTag(url)).toBe(
      '<iframe src="http://localhost:5601/app/dashboards#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b?embed=true&_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-7d%2Fd,to:now))" height="600" width="800"></iframe>'
    );
  });

  it('does not modify url', () => {
    const url = 'http://localhost:5601/app/home#/';
    makeIframeTag(url);
    expect(url).toBe(url);
  });
});
