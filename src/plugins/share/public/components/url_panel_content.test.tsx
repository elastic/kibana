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

import { EuiCopy, EuiRadioGroup, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';

jest.mock('../lib/url_shortener', () => ({ shortenUrl: jest.fn() }));

import React from 'react';
import { shallow } from 'enzyme';

import { ExportUrlAsType, UrlPanelContent } from './url_panel_content';
import { act } from 'react-dom/test-utils';
import { shortenUrl } from '../lib/url_shortener';

const defaultProps = {
  allowShortUrl: true,
  objectType: 'dashboard',
  basePath: '',
  post: () => Promise.resolve({} as any),
};

describe('share url panel content', () => {
  test('render', () => {
    const component = shallow(<UrlPanelContent {...defaultProps} />);
    expect(component).toMatchSnapshot();
  });

  test('should enable saved object export option when objectId is provided', () => {
    const component = shallow(<UrlPanelContent {...defaultProps} objectId="id1" />);
    expect(component).toMatchSnapshot();
  });

  test('should hide short url section when allowShortUrl is false', () => {
    const component = shallow(
      <UrlPanelContent {...defaultProps} allowShortUrl={false} objectId="id1" />
    );
    expect(component).toMatchSnapshot();
  });

  test('should remove _a query parameter in saved object mode', () => {
    const component = shallow(
      <UrlPanelContent
        {...defaultProps}
        shareableUrl="http://localhost:5601/app/myapp#/?_g=()&_a=()"
        allowShortUrl={false}
        objectId="id1"
      />
    );
    act(() => {
      component.find(EuiRadioGroup).prop('onChange')!(ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT);
    });
    expect(component.find(EuiCopy).prop('textToCopy')).toEqual(
      'http://localhost:5601/app/myapp#/?_g=()'
    );
  });

  describe('short url', () => {
    test('should generate short url and put it in copy button', async () => {
      const shortenUrlMock = shortenUrl as jest.Mock;
      shortenUrlMock.mockReset();
      shortenUrlMock.mockResolvedValue('http://localhost/short/url');

      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          shareableUrl="http://localhost:5601/app/myapp#/?_g=()&_a=()"
          objectId="id1"
        />
      );
      await act(async () => {
        component.find(EuiSwitch).prop('onChange')!(({
          target: { checked: true },
        } as unknown) as EuiSwitchEvent);
      });
      expect(shortenUrlMock).toHaveBeenCalledWith(
        'http://localhost:5601/app/myapp#/?_g=()&_a=()',
        expect.anything()
      );
      expect(component.find(EuiCopy).prop('textToCopy')).toContain('http://localhost/short/url');
    });

    test('should hide short url for saved object mode', async () => {
      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          shareableUrl="http://localhost:5601/app/myapp#/"
          objectId="id1"
        />
      );
      act(() => {
        component.find(EuiRadioGroup).prop('onChange')!(ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT);
      });
      expect(component.exists(EuiSwitch)).toEqual(false);
    });
  });

  describe('embedded', () => {
    const asIframe = (url: string) => `<iframe src="${url}" height="600" width="800"></iframe>`;

    test('should add embedded flag to target code in snapshot mode', () => {
      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          shareableUrl="http://localhost:5601/app/myapp#/"
          isEmbedded
          allowShortUrl={false}
          objectId="id1"
        />
      );
      expect(component.find(EuiCopy).prop('textToCopy')).toEqual(
        asIframe('http://localhost:5601/app/myapp#/?embed=true')
      );
    });

    test('should add embedded flag to target code in snapshot mode with existing query parameters', () => {
      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          shareableUrl="http://localhost:5601/app/myapp#/?_g=()&_a=()"
          isEmbedded
          allowShortUrl={false}
          objectId="id1"
        />
      );
      expect(component.find(EuiCopy).prop('textToCopy')).toEqual(
        asIframe('http://localhost:5601/app/myapp#/?embed=true&_g=()&_a=()')
      );
    });

    test('should remove _a query parameter and add embedded flag in saved object mode', () => {
      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          shareableUrl="http://localhost:5601/app/myapp#/?_g=()&_a=()"
          isEmbedded
          allowShortUrl={false}
          objectId="id1"
        />
      );
      act(() => {
        component.find(EuiRadioGroup).prop('onChange')!(ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT);
      });
      expect(component.find(EuiCopy).prop('textToCopy')).toEqual(
        asIframe('http://localhost:5601/app/myapp#/?embed=true&_g=()')
      );
    });

    test('should generate short url with embed flag and put it in copy button', async () => {
      const shortenUrlMock = shortenUrl as jest.Mock;
      shortenUrlMock.mockReset();
      shortenUrlMock.mockResolvedValue('http://localhost/short/url');

      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          isEmbedded
          shareableUrl="http://localhost:5601/app/myapp#/?_g=()&_a=()"
          objectId="id1"
        />
      );
      await act(async () => {
        component.find(EuiSwitch).prop('onChange')!(({
          target: { checked: true },
        } as unknown) as EuiSwitchEvent);
      });
      expect(shortenUrlMock).toHaveBeenCalledWith(
        'http://localhost:5601/app/myapp#/?embed=true&_g=()&_a=()',
        expect.anything()
      );
      expect(component.find(EuiCopy).prop('textToCopy')).toContain('http://localhost/short/url');
    });

    test('should hide short url for saved object mode', async () => {
      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          isEmbedded
          shareableUrl="http://localhost:5601/app/myapp#/"
          objectId="id1"
        />
      );
      act(() => {
        component.find(EuiRadioGroup).prop('onChange')!(ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT);
      });
      expect(component.exists(EuiSwitch)).toEqual(false);
    });
  });
});

test('should show url param extensions', () => {
  const TestExtension = () => <div data-test-subj="testExtension" />;
  const extensions = [{ paramName: 'testExtension', component: TestExtension }];
  const component = shallow(
    <UrlPanelContent {...defaultProps} urlParamExtensions={extensions} objectId="id1" />
  );
  expect(component.find('TestExtension').length).toBe(1);
  expect(component).toMatchSnapshot();
});
