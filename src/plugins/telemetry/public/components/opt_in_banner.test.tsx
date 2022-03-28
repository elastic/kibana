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
import { OptInBanner } from './opt_in_banner';
import { mockTelemetryConstants } from '../mocks';

describe('OptInDetailsComponent', () => {
  const telemetryConstants = mockTelemetryConstants();

  it('renders as expected', () => {
    expect(
      shallowWithIntl(
        <OptInBanner onChangeOptInClick={() => {}} telemetryConstants={telemetryConstants} />
      )
    ).toMatchSnapshot();
  });

  it('fires the "onChangeOptInClick" prop with true when a enable is clicked', () => {
    const onClick = jest.fn();
    const component = shallowWithIntl(
      <OptInBanner onChangeOptInClick={onClick} telemetryConstants={telemetryConstants} />
    );

    const enableButton = component.findWhere((n) => {
      const props = n.props();
      return n.type() === EuiButton && props['data-test-subj'] === 'enable';
    });

    if (!enableButton) {
      throw new Error(`Couldn't find any opt in enable button.`);
    }

    enableButton.simulate('click');
    expect(onClick).toHaveBeenCalled();
    expect(onClick).toBeCalledWith(true);
  });

  it('fires the "onChangeOptInClick" with false when a disable is clicked', () => {
    const onClick = jest.fn();
    const component = shallowWithIntl(
      <OptInBanner onChangeOptInClick={onClick} telemetryConstants={telemetryConstants} />
    );

    const disableButton = component.findWhere((n) => {
      const props = n.props();
      return n.type() === EuiButton && props['data-test-subj'] === 'disable';
    });

    if (!disableButton) {
      throw new Error(`Couldn't find any opt in disable button.`);
    }

    disableButton.simulate('click');
    expect(onClick).toHaveBeenCalled();
    expect(onClick).toBeCalledWith(false);
  });
});
