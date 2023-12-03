/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GuideCards, GuideCardsProps } from './guide_cards';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { I18nStart } from '@kbn/core-i18n-browser';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';

const defaultProps: GuideCardsProps = {
  activateGuide: jest.fn(),
  navigateToApp: jest.fn(),
  guidesState: [],
  activeFilter: 'search',
  openModal: jest.fn(),
  theme: themeServiceMock.createStartContract(),
  i18nStart: {} as unknown as I18nStart,
  cloud: cloudMock.createSetup(),
  docLinks: docLinksServiceMock.createStartContract(),
  navigateToUrl: jest.fn(),
  url: sharePluginMock.createSetupContract().url,
};

describe('guide cards', () => {
  describe('snapshots', () => {
    test('should render all cards', async () => {
      const component = await shallow(<GuideCards {...defaultProps} />);
      expect(component).toMatchSnapshot();
    });
  });
});
