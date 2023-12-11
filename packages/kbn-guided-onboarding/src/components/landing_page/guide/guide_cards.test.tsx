/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';

import { GuideCards, GuideCardsProps } from './guide_cards';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { I18nStart } from '@kbn/core-i18n-browser';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { GuideCardSolutions } from '../classic_version/guide_cards';

const defaultProps: Omit<GuideCardsProps, 'activeFilter'> = {
  activateGuide: jest.fn(),
  navigateToApp: jest.fn(),
  guidesState: [],
  openModal: jest.fn(),
  theme: themeServiceMock.createStartContract(),
  i18nStart: {} as unknown as I18nStart,
  cloud: cloudMock.createSetup(),
  docLinks: docLinksServiceMock.createStartContract(),
  navigateToUrl: jest.fn(),
  url: sharePluginMock.createSetupContract().url,
};

// FLAKY: https://github.com/elastic/kibana/issues/172595
// FLAKY: https://github.com/elastic/kibana/issues/172596
// FLAKY: https://github.com/elastic/kibana/issues/172597
describe.skip('guide cards', () => {
  describe('snapshots', () => {
    test('should render search cards', async () => {
      const component = mount(
        <GuideCards {...defaultProps} activeFilter={'search' as GuideCardSolutions} />
      );
      expect(component).toMatchSnapshot();
    });
    test('should render security cards', async () => {
      const component = mount(
        <GuideCards {...defaultProps} activeFilter={'security' as GuideCardSolutions} />
      );
      expect(component).toMatchSnapshot();
    });
    test('should render observability cards', async () => {
      const component = mount(
        <GuideCards {...defaultProps} activeFilter={'observability' as GuideCardSolutions} />
      );
      expect(component).toMatchSnapshot();
    });
  });
});
