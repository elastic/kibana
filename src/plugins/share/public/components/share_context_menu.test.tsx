/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ShareMenuItem } from '../types';

jest.mock('../lib/url_shortener', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import { ShareContextMenu } from './share_context_menu';

const defaultProps = {
  allowEmbed: true,
  allowShortUrl: false,
  shareMenuItems: [],
  sharingData: null,
  isDirty: false,
  onClose: () => {},
  basePath: '',
  post: () => Promise.resolve({} as any),
  objectType: 'dashboard',
};

test('should render context menu panel when there are more than one panel', () => {
  const component = shallow(<ShareContextMenu {...defaultProps} />);
  expect(component).toMatchSnapshot();
});

test('should only render permalink panel when there are no other panels', () => {
  const component = shallow(<ShareContextMenu {...defaultProps} allowEmbed={false} />);
  expect(component).toMatchSnapshot();
});

describe('shareContextMenuExtensions', () => {
  const shareContextMenuItems: ShareMenuItem[] = [
    {
      panel: {
        id: '1',
        title: 'AAA panel',
        content: <div>panel content</div>,
      },
      shareMenuItem: {
        name: 'AAA panel',
        sortOrder: 5,
      },
    },
    {
      panel: {
        id: '2',
        title: 'ZZZ panel',
        content: <div>panel content</div>,
      },
      shareMenuItem: {
        name: 'ZZZ panel',
        sortOrder: 0,
      },
    },
  ];

  test('should sort ascending on sort order first and then ascending on name', () => {
    const component = shallow(
      <ShareContextMenu
        {...defaultProps}
        allowEmbed={false}
        shareMenuItems={shareContextMenuItems}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
