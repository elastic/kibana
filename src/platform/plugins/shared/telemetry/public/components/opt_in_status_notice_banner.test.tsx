/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { mockTelemetryConstants, mockTelemetryService } from '../mocks';
import { OptInStatusNoticeBanner } from './opt_in_status_notice_banner';
import { OptInMessage } from './opt_in_message';

const mockHttp = httpServiceMock.createStartContract();
const telemetryConstants = mockTelemetryConstants();
const telemetryService = mockTelemetryService();

describe('OptInStatusNoticeBanner', () => {
  it('renders as expected', () => {
    const onSeenBanner = () => {};
    const dom = shallowWithIntl(
      <OptInStatusNoticeBanner
        onSeenBanner={onSeenBanner}
        http={mockHttp}
        telemetryConstants={telemetryConstants}
        telemetryService={telemetryService}
      />
    );
    expect(
      dom.containsMatchingElement(
        <OptInMessage
          telemetryConstants={telemetryConstants}
          telemetryService={telemetryService}
          addBasePath={mockHttp.basePath.prepend}
          onClick={onSeenBanner}
        />
      )
    ).toBe(true);
  });

  it('fires the "onSeenBanner" prop when a link is clicked', () => {
    const onLinkClick = jest.fn();
    const component = shallowWithIntl(
      <OptInStatusNoticeBanner
        onSeenBanner={onLinkClick}
        http={mockHttp}
        telemetryConstants={telemetryConstants}
        telemetryService={telemetryService}
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
