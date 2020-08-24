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
import { render, mount } from 'enzyme';
import { MarkdownVisWrapper } from './markdown_vis_controller';

describe('markdown vis controller', () => {
  it('should set html from markdown params', () => {
    const vis = {
      params: {
        openLinksInNewTab: false,
        fontSize: 16,
        markdown:
          'This is a test of the [markdown](http://daringfireball.net/projects/markdown) vis.',
      },
    };

    const wrapper = render(
      <MarkdownVisWrapper visParams={vis.params} renderComplete={jest.fn()} fireEvent={jest.fn()} />
    );
    expect(wrapper.find('a').text()).toBe('markdown');
  });

  it('should not render the html', () => {
    const vis = {
      params: {
        openLinksInNewTab: false,
        fontSize: 16,
        markdown: 'Testing <a>html</a>',
      },
    };

    const wrapper = render(
      <MarkdownVisWrapper visParams={vis.params} renderComplete={jest.fn()} fireEvent={jest.fn()} />
    );
    expect(wrapper.text()).toBe('Testing <a>html</a>\n');
  });

  it('should update the HTML when render again with changed params', () => {
    const vis = {
      params: {
        openLinksInNewTab: false,
        fontSize: 16,
        markdown: 'Initial',
      },
    };

    const wrapper = mount(
      <MarkdownVisWrapper visParams={vis.params} renderComplete={jest.fn()} fireEvent={jest.fn()} />
    );
    expect(wrapper.text().trim()).toBe('Initial');
    vis.params.markdown = 'Updated';
    wrapper.setProps({ vis });
    expect(wrapper.text().trim()).toBe('Updated');
  });

  describe('renderComplete', () => {
    const vis = {
      params: {
        openLinksInNewTab: false,
        fontSize: 16,
        markdown: 'test',
      },
    };

    const renderComplete = jest.fn();

    beforeEach(() => {
      renderComplete.mockClear();
    });

    it('should be called on initial rendering', () => {
      mount(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );
      expect(renderComplete.mock.calls.length).toBe(1);
    });

    it('should be called on successive render when params change', () => {
      mount(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );
      expect(renderComplete.mock.calls.length).toBe(1);
      renderComplete.mockClear();
      vis.params.markdown = 'changed';
      mount(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );
      expect(renderComplete.mock.calls.length).toBe(1);
    });

    it('should be called on successive render even without data change', () => {
      mount(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );
      expect(renderComplete.mock.calls.length).toBe(1);
      renderComplete.mockClear();
      mount(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );
      expect(renderComplete.mock.calls.length).toBe(1);
    });
  });
});
