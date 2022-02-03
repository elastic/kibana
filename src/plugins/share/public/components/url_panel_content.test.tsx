/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCopy, EuiRadioGroup, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';

import React from 'react';
import { shallow } from 'enzyme';

import { ExportUrlAsType, UrlPanelContent, UrlPanelContentProps } from './url_panel_content';
import { act } from 'react-dom/test-utils';

const createFromLongUrl = jest.fn(async () => ({
  url: 'http://localhost/short/url',
  data: {} as any,
  locator: {} as any,
  params: {} as any,
}));

const defaultProps: UrlPanelContentProps = {
  allowShortUrl: true,
  objectType: 'dashboard',
  urlService: {
    locators: {} as any,
    shortUrls: {
      get: () =>
        ({
          createFromLongUrl,
          create: async () => {
            throw new Error('not implemented');
          },
          createWithLocator: async () => {
            throw new Error('not implemented');
          },
          get: async () => {
            throw new Error('not implemented');
          },
          resolve: async () => {
            throw new Error('not implemented');
          },
          delete: async () => {
            throw new Error('not implemented');
          },
        } as any),
    },
  } as any,
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
      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          shareableUrl="http://localhost:5601/app/myapp#/?_g=()&_a=()"
          objectId="id1"
        />
      );
      await act(async () => {
        component.find(EuiSwitch).prop('onChange')!({
          target: { checked: true },
        } as unknown as EuiSwitchEvent);
      });
      expect(createFromLongUrl).toHaveBeenCalledWith(
        'http://localhost:5601/app/myapp#/?_g=()&_a=()'
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
      const component = shallow(
        <UrlPanelContent
          {...defaultProps}
          isEmbedded
          shareableUrl="http://localhost:5601/app/myapp#/?_g=()&_a=()"
          objectId="id1"
        />
      );
      await act(async () => {
        component.find(EuiSwitch).prop('onChange')!({
          target: { checked: true },
        } as unknown as EuiSwitchEvent);
      });
      expect(createFromLongUrl).toHaveBeenCalledWith(
        'http://localhost:5601/app/myapp#/?embed=true&_g=()&_a=()'
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
