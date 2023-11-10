/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { waitFor, render } from '@testing-library/react';
import MarkdownVisComponent from './markdown_vis_controller';

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
      <MarkdownVisComponent {...vis.params} renderComplete={jest.fn()} />
    );

    await waitFor(() => getByTestId('markdownBody'));

    expect(getByText('markdown')).toMatchInlineSnapshot(`
      <a
        class="euiLink emotion-euiLink-primary"
        href="http://daringfireball.net/projects/markdown"
        rel="noreferrer"
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
      <MarkdownVisComponent {...vis.params} renderComplete={jest.fn()} />
    );

    await waitFor(() => getByTestId('markdownBody'));

    expect(getByText(/testing/i)).toMatchInlineSnapshot(`
      <p>
        Testing 
        html
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
      <MarkdownVisComponent {...vis.params} renderComplete={jest.fn()} />
    );

    await waitFor(() => getByTestId('markdownBody'));

    expect(getByText(/initial/i)).toBeInTheDocument();

    vis.params.markdown = 'Updated';
    rerender(<MarkdownVisComponent {...vis.params} renderComplete={jest.fn()} />);

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
        <MarkdownVisComponent {...vis.params} renderComplete={renderComplete} />
      );

      await waitFor(() => getByTestId('markdownBody'));

      expect(renderComplete).toHaveBeenCalledTimes(1);
    });

    it('should be called on successive render when params change', async () => {
      const { getByTestId, rerender } = render(
        <MarkdownVisComponent {...vis.params} renderComplete={renderComplete} />
      );

      await waitFor(() => getByTestId('markdownBody'));

      expect(renderComplete).toHaveBeenCalledTimes(1);

      renderComplete.mockClear();
      vis.params.markdown = 'changed';

      rerender(<MarkdownVisComponent {...vis.params} renderComplete={renderComplete} />);

      expect(renderComplete).toHaveBeenCalledTimes(1);
    });

    it('should be called on successive render even without data change', async () => {
      const { getByTestId, rerender } = render(
        <MarkdownVisComponent {...vis.params} renderComplete={renderComplete} />
      );

      await waitFor(() => getByTestId('markdownBody'));

      expect(renderComplete).toHaveBeenCalledTimes(1);

      renderComplete.mockClear();

      rerender(<MarkdownVisComponent {...vis.params} renderComplete={renderComplete} />);

      expect(renderComplete).toHaveBeenCalledTimes(1);
    });
  });
});
