/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';

import { UiNavLink } from '../ui_nav_link';

describe('UiNavLink', () => {
  describe('constructor', () => {
    it('initializes the object properties as expected', () => {
      const spec = {
        id: 'discover',
        title: 'Discover',
        order: -1003,
        url: '/app/discover#/',
        euiIconType: 'discoverApp',
        hidden: true,
        disabled: true,
      };

      const link = new UiNavLink(spec);
      expect(link.toJSON()).to.eql({
        id: spec.id,
        title: spec.title,
        order: spec.order,
        url: spec.url,
        subUrlBase: spec.url,
        icon: spec.icon,
        euiIconType: spec.euiIconType,
        hidden: spec.hidden,
        disabled: spec.disabled,
        category: undefined,

        // defaults
        linkToLastSubUrl: true,
        disableSubUrlTracking: undefined,
        tooltip: '',
      });
    });

    it('initializes the order property to 0 when order is not specified in the spec', () => {
      const spec = {
        id: 'discover',
        title: 'Discover',
        url: '/app/discover#/',
      };
      const link = new UiNavLink(spec);

      expect(link.toJSON()).to.have.property('order', 0);
    });

    it('initializes the linkToLastSubUrl property to false when false is specified in the spec', () => {
      const spec = {
        id: 'discover',
        title: 'Discover',
        order: -1003,
        url: '/app/discover#/',
        linkToLastSubUrl: false,
      };
      const link = new UiNavLink(spec);

      expect(link.toJSON()).to.have.property('linkToLastSubUrl', false);
    });

    it('initializes the linkToLastSubUrl property to true by default', () => {
      const spec = {
        id: 'discover',
        title: 'Discover',
        order: -1003,
        url: '/app/discover#/',
      };
      const link = new UiNavLink(spec);

      expect(link.toJSON()).to.have.property('linkToLastSubUrl', true);
    });

    it('initializes the hidden property to false by default', () => {
      const spec = {
        id: 'discover',
        title: 'Discover',
        order: -1003,
        url: '/app/discover#/',
      };
      const link = new UiNavLink(spec);

      expect(link.toJSON()).to.have.property('hidden', false);
    });

    it('initializes the disabled property to false by default', () => {
      const spec = {
        id: 'discover',
        title: 'Discover',
        order: -1003,
        url: '/app/discover#/',
      };
      const link = new UiNavLink(spec);

      expect(link.toJSON()).to.have.property('disabled', false);
    });

    it('initializes the tooltip property to an empty string by default', () => {
      const spec = {
        id: 'discover',
        title: 'Discover',
        order: -1003,
        url: '/app/discover#/',
      };
      const link = new UiNavLink(spec);

      expect(link.toJSON()).to.have.property('tooltip', '');
    });
  });
});
