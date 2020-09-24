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
import { wait } from '@testing-library/dom';
import { render, cleanup } from '@testing-library/react/pure';
import { MarkdownVisWrapper } from './markdown_vis_controller';

afterEach(cleanup);

describe('markdown vis controller', () => {
  it('should set html from markdown params', async () => {
    const vis = {
      params: {
        openLinksInNewTab: false,
        fontSize: 16,
        markdown:
          'This is a test of the [markdown](http://daringfireball.net/projects/markdown) vis.',
      },
    };

    const { getByTestId, getByText } = render(
      <MarkdownVisWrapper visParams={vis.params} renderComplete={jest.fn()} fireEvent={jest.fn()} />
    );

    await wait(() => getByTestId('markdownBody'));

    expect(getByText('markdown')).toMatchInlineSnapshot(`
      <a
        href="http://daringfireball.net/projects/markdown"
      >
        markdown
      </a>
    `);
  });

  it('should not render the html', async () => {
    const vis = {
      params: {
        openLinksInNewTab: false,
        fontSize: 16,
        markdown: 'Testing <a>html</a>',
      },
    };

    const { getByTestId, getByText } = render(
      <MarkdownVisWrapper visParams={vis.params} renderComplete={jest.fn()} fireEvent={jest.fn()} />
    );

    await wait(() => getByTestId('markdownBody'));

    expect(getByText(/testing/i)).toMatchInlineSnapshot(`
      <p>
        Testing &lt;a&gt;html&lt;/a&gt;
      </p>
    `);
  });

  it('should update the HTML when render again with changed params', async () => {
    const vis = {
      params: {
        openLinksInNewTab: false,
        fontSize: 16,
        markdown: 'Initial',
      },
    };

    const { getByTestId, getByText, rerender } = render(
      <MarkdownVisWrapper visParams={vis.params} renderComplete={jest.fn()} fireEvent={jest.fn()} />
    );

    await wait(() => getByTestId('markdownBody'));

    expect(getByText(/initial/i)).toBeInTheDocument();

    vis.params.markdown = 'Updated';
    rerender(
      <MarkdownVisWrapper visParams={vis.params} renderComplete={jest.fn()} fireEvent={jest.fn()} />
    );

    expect(getByText(/Updated/i)).toBeInTheDocument();
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

    it('should be called on initial rendering', async () => {
      const { getByTestId } = render(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );

      await wait(() => getByTestId('markdownBody'));

      expect(renderComplete).toHaveBeenCalledTimes(1);
    });

    it('should be called on successive render when params change', async () => {
      const { getByTestId, rerender } = render(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );

      await wait(() => getByTestId('markdownBody'));

      expect(renderComplete).toHaveBeenCalledTimes(1);

      renderComplete.mockClear();
      vis.params.markdown = 'changed';

      rerender(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );

      expect(renderComplete).toHaveBeenCalledTimes(1);
    });

    it('should be called on successive render even without data change', async () => {
      const { getByTestId, rerender } = render(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );

      await wait(() => getByTestId('markdownBody'));

      expect(renderComplete).toHaveBeenCalledTimes(1);

      renderComplete.mockClear();

      rerender(
        <MarkdownVisWrapper
          visParams={vis.params}
          renderComplete={renderComplete}
          fireEvent={jest.fn()}
        />
      );

      expect(renderComplete).toHaveBeenCalledTimes(1);
    });
  });
});
