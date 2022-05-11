/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { OptedInNoticeBanner } from './opted_in_notice_banner';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { mockTelemetryConstants } from '../mocks';

const mockHttp = httpServiceMock.createStartContract();
const telemetryConstants = mockTelemetryConstants();

describe('OptInDetailsComponent', () => {
  it('renders as expected', () => {
    expect(
      shallowWithIntl(
        <OptedInNoticeBanner
          onSeenBanner={() => {}}
          http={mockHttp}
          telemetryConstants={telemetryConstants}
        />
      )
    ).toMatchSnapshot();
  });

  it('fires the "onSeenBanner" prop when a link is clicked', () => {
    const onLinkClick = jest.fn();
    const component = shallowWithIntl(
      <OptedInNoticeBanner
        onSeenBanner={onLinkClick}
        http={mockHttp}
        telemetryConstants={telemetryConstants}
      />
    );

    const button = component.findWhere((n) => n.type() === EuiButton);

    if (!button) {
      throw new Error(`Couldn't find any buttons in opt-in notice`);
    }

    button.simulate('click');

    expect(onLinkClick).toHaveBeenCalled();
  });
});
