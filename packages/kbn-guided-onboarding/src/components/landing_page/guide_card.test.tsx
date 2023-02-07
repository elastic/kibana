/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { GuideCard } from './guide_card';
import { EuiCard } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { activateGuideMock, navigateToAppGuideMock } from '../../mocks';

describe('guide cards', () => {
  describe('snapshots', () => {
    test('should render card', async () => {
      const component = await shallow(<GuideCard {...activateGuideMock} />);
      expect(component).toMatchSnapshot();
    });
  });

  describe('Navigation', () => {
    test('Should activate guide default state if has guide ID', async () => {
      const props = {
        ...activateGuideMock,
        activateGuideDefaultState: jest.fn(),
      };
      const component = await mount(<GuideCard {...props} />);
      const { activateGuideDefaultState, guidesState } = props;
      const card = component.find(EuiCard);

      await act(async () => {
        // @ts-ignore
        card.props().onClick({});
      });
      component.update();

      expect(activateGuideDefaultState).toHaveBeenCalledTimes(1);
      expect(activateGuideDefaultState).toBeCalledWith(guidesState[0].guideId, guidesState[0]);
    });

    test('Should navigate to guide path if navigation path provided', async () => {
      const props = {
        ...navigateToAppGuideMock,
        activateGuideDefaultState: jest.fn(),
      };
      const component = await mount(<GuideCard {...props} />);
      const card = component.find(EuiCard);

      await act(async () => {
        // @ts-ignore
        card.props().onClick({});
      });
      component.update();

      const { activateGuideDefaultState } = props;
      const {
        navigateToApp,
        card: { navigateTo },
      } = navigateToAppGuideMock;
      expect(activateGuideDefaultState).toHaveBeenCalledTimes(0);
      expect(navigateToApp).toHaveBeenCalledTimes(1);
      expect(navigateToApp).toBeCalledWith(navigateTo?.appId, { path: navigateTo?.path });
    });
  });
});
