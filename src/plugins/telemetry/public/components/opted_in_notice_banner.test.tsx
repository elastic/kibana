/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { shallowWithIntl } from '@kbn/test/jest';
import { OptedInNoticeBanner } from './opted_in_notice_banner';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { httpServiceMock } from '../../../../core/public/http/http_service.mock';

const mockHttp = httpServiceMock.createStartContract();

describe('OptInDetailsComponent', () => {
  it('renders as expected', () => {
    expect(
      shallowWithIntl(<OptedInNoticeBanner onSeenBanner={() => {}} http={mockHttp} />)
    ).toMatchSnapshot();
  });

  it('fires the "onSeenBanner" prop when a link is clicked', () => {
    const onLinkClick = jest.fn();
    const component = shallowWithIntl(
      <OptedInNoticeBanner onSeenBanner={onLinkClick} http={mockHttp} />
    );

    const button = component.findWhere((n) => n.type() === EuiButton);

    if (!button) {
      throw new Error(`Couldn't find any buttons in opt-in notice`);
    }

    button.simulate('click');

    expect(onLinkClick).toHaveBeenCalled();
  });
});
