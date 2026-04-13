/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
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

  it('fires the "onSeenBanner" prop when the callout is dismissed', () => {
    const onDismiss = jest.fn();
    const component = shallowWithIntl(
      <OptInStatusNoticeBanner
        onSeenBanner={onDismiss}
        http={mockHttp}
        telemetryConstants={telemetryConstants}
        telemetryService={telemetryService}
      />
    );

    const callOut = component.find(EuiCallOut);
    expect(callOut.prop('onDismiss')).toBe(onDismiss);
    callOut.prop('onDismiss')!();

    expect(onDismiss).toHaveBeenCalled();
  });
});
