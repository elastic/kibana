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
