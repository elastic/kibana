/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EmbedContent } from './embed_content';
import React from 'react';
import { ReactWrapper } from 'enzyme';

describe('Share modal embed content tab', () => {
  describe('share url embedded', () => {
    let component: ReactWrapper;

    beforeEach(() => {
      component = mountWithIntl(
        <EmbedContent
          objectType="dashboard"
          setIsNotSaved={() => jest.fn()}
          shareableUrl="/home#/"
        />
      );
    });

    it('works for simple url', async () => {
      component.setProps({ shareableUrl: 'http://localhost:5601/app/home#/' });
      component.update();

      const shareUrl = component
        .find('button[data-test-subj="copyEmbedUrlButton"]')
        .prop('data-share-url');
      expect(shareUrl).toBe(
        '<iframe src="http://localhost:5601/app/home#/?embed=true&_g=" height="600" width="800"></iframe>'
      );
    });

    it('works if the url has a query string', async () => {
      component.setProps({
        shareableUrl:
          'http://localhost:5601/app/dashboards#/create?_g=(refreshInterval%3A(pause%3A!t%2Cvalue%3A60000)%2Ctime%3A(from%3Anow-15m%2Cto%3Anow))',
      });
      component.update();

      const shareUrl = component
        .find('button[data-test-subj="copyEmbedUrlButton"]')
        .prop('data-share-url');
      expect(shareUrl).toBe(
        '<iframe src="http://localhost:5601/app/dashboards#/create?embed=true&_g=(refreshInterval%3A(pause%3A!t%2Cvalue%3A60000)%2Ctime%3A(from%3Anow-15m%2Cto%3Anow))" height="600" width="800"></iframe>'
      );
    });
  });
});
