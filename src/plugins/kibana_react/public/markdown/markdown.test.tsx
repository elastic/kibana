/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { text as specText } from 'commonmark-spec';
import { Markdown } from './markdown';

test('renders consistently matches to spec', () => {
  const component = shallow(<Markdown markdown={specText} />);
  expect(component).toMatchSnapshot();
});

test('should never render html tags', () => {
  const component = shallow(
    <Markdown markdown="<div>I may be dangerous if rendered as html</div>" />
  );
  expect(component).toMatchSnapshot();
});

test('should render links with parentheses correctly', () => {
  const component = shallow(
    <Markdown markdown="[link](https://example.com/foo/bar?group=(()filters:!t))" />
  );
  expect(component.render().find('a').prop('href')).toBe(
    'https://example.com/foo/bar?group=(()filters:!t)'
  );
});

test('should add `noreferrer` and `nooopener` to all links in new tabs', () => {
  const component = shallow(
    <Markdown
      openLinksInNewTab={true}
      markdown="[link](https://example.com/foo/bar?group=(()filters:!t))"
    />
  );
  expect(component.render().find('a').prop('rel')).toBe('noopener noreferrer');
});

describe('props', () => {
  const markdown = 'I am *some* [content](https://en.wikipedia.org/wiki/Content) with `markdown`';

  test('markdown', () => {
    const component = shallow(<Markdown markdown={markdown} />);
    expect(component).toMatchSnapshot();
  });

  test('openLinksInNewTab', () => {
    const component = shallow(<Markdown openLinksInNewTab={true} markdown={markdown} />);
    expect(component).toMatchSnapshot();
  });

  test('whiteListedRules', () => {
    const component = shallow(
      <Markdown whiteListedRules={['backticks', 'emphasis']} markdown={markdown} />
    );
    expect(component).toMatchSnapshot();
  });

  test('should update markdown when openLinksInNewTab prop change', () => {
    const component = shallow(<Markdown openLinksInNewTab={false} markdown={markdown} />);
    expect(component.render().find('a').prop('target')).not.toBe('_blank');
    component.setProps({ openLinksInNewTab: true });
    expect(component.render().find('a').prop('target')).toBe('_blank');
  });

  test('should update markdown when whiteListedRules prop change', () => {
    const md = '*emphasis* `backticks`';
    const component = shallow(
      <Markdown whiteListedRules={['emphasis', 'backticks']} markdown={md} />
    );
    expect(component.render().find('em')).toHaveLength(1);
    expect(component.render().find('code')).toHaveLength(1);
    component.setProps({ whiteListedRules: ['backticks'] });
    expect(component.render().find('code')).toHaveLength(1);
    expect(component.render().find('em')).toHaveLength(0);
  });
});
