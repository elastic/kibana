/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GuideCardFooter, GuideCardFooterProps } from './guide_card_footer';
import { GuideState } from '../../types';

const defaultProps: GuideCardFooterProps = {
  guides: [],
  useCase: 'search',
  telemetryId: 'search',
  activateGuide: jest.fn(),
};

const searchGuideState: GuideState = {
  guideId: 'search',
  status: 'not_started',
  steps: [
    { id: 'add_data', status: 'complete' },
    { id: 'search_experience', status: 'in_progress' },
  ],
  isActive: true,
};
describe('guide card footer', () => {
  describe('snapshots', () => {
    test('should render the footer when the guided onboarding has not started yet', async () => {
      const component = await shallow(<GuideCardFooter {...defaultProps} />);
      expect(component).toMatchSnapshot();
    });

    test('should render the footer when the guide has not started yet', async () => {
      const component = await shallow(
        <GuideCardFooter {...defaultProps} guides={[searchGuideState]} />
      );
      expect(component).toMatchSnapshot();
    });

    test('should render the footer when the guide is in progress', async () => {
      const component = await shallow(
        <GuideCardFooter
          {...defaultProps}
          guides={[{ ...searchGuideState, status: 'in_progress' }]}
        />
      );
      expect(component).toMatchSnapshot();
    });

    test('should render the footer when the guide is ready to complete', async () => {
      const component = await shallow(
        <GuideCardFooter
          {...defaultProps}
          guides={[{ ...searchGuideState, status: 'ready_to_complete' }]}
        />
      );
      expect(component).toMatchSnapshot();
    });

    test('should render the footer when the guide has been completed', async () => {
      const component = await shallow(
        <GuideCardFooter {...defaultProps} guides={[{ ...searchGuideState, status: 'complete' }]} />
      );
      expect(component).toMatchSnapshot();
    });
  });
});
