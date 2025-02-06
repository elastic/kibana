/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { InTableSearchHighlightsWrapper } from './in_table_search_highlights_wrapper';
import { render, waitFor, screen } from '@testing-library/react';

const colors = {
  highlightColor: 'black',
  highlightBackgroundColor: 'green',
};

describe('InTableSearchHighlightsWrapper', () => {
  describe('modifies the DOM and adds search highlights', () => {
    it('with matches', async () => {
      const { container } = render(
        <InTableSearchHighlightsWrapper inTableSearchTerm="test" {...colors}>
          <div>
            Some text here with test and test and even more Test to be sure
            <div>test</div>
            <div>this</div>
            <img src="https://test.com" alt="not for test" />
          </div>
        </InTableSearchHighlightsWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('test')).toHaveLength(3);
        expect(screen.getAllByText('Test')).toHaveLength(1);
      });

      expect(container.innerHTML).toMatchInlineSnapshot(
        `"<div><div>Some text here with <mark style=\\"color: black; background-color: green;\\" class=\\"dataGridInTableSearch__match\\" data-match-index=\\"0\\">test</mark> and <mark style=\\"color: black; background-color: green;\\" class=\\"dataGridInTableSearch__match\\" data-match-index=\\"1\\">test</mark> and even more <mark style=\\"color: black; background-color: green;\\" class=\\"dataGridInTableSearch__match\\" data-match-index=\\"2\\">Test</mark> to be sure<div><mark style=\\"color: black; background-color: green;\\" class=\\"dataGridInTableSearch__match\\" data-match-index=\\"3\\">test</mark></div><div>this</div><img src=\\"https://test.com\\" alt=\\"not for test\\"></div></div>"`
      );
    });

    it('with single match', async () => {
      const { container } = render(
        <InTableSearchHighlightsWrapper inTableSearchTerm="test2" {...colors}>
          <div>test2</div>
        </InTableSearchHighlightsWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('test2')).toHaveLength(1);
      });

      expect(container.innerHTML).toMatchInlineSnapshot(
        `"<div><div><mark style=\\"color: black; background-color: green;\\" class=\\"dataGridInTableSearch__match\\" data-match-index=\\"0\\">test2</mark></div></div>"`
      );
    });

    it('with no matches', async () => {
      const { container } = render(
        <InTableSearchHighlightsWrapper inTableSearchTerm="test3" {...colors}>
          <div>test2</div>
        </InTableSearchHighlightsWrapper>
      );

      expect(container.innerHTML).toMatchInlineSnapshot(`"<div><div>test2</div></div>"`);
    });

    it('escape the input with tags', async () => {
      const { container } = render(
        <InTableSearchHighlightsWrapper inTableSearchTerm="<hr />" {...colors}>
          <div>
            <hr />
            <div>test</div>
            <div>{'this <hr />'}</div>
          </div>
        </InTableSearchHighlightsWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('<hr />')).toHaveLength(1);
      });

      expect(container.innerHTML).toMatchInlineSnapshot(
        `"<div><div><hr><div>test</div><div>this <mark style=\\"color: black; background-color: green;\\" class=\\"dataGridInTableSearch__match\\" data-match-index=\\"0\\">&lt;hr /&gt;</mark></div></div></div>"`
      );
    });

    it('escape the input with regex', async () => {
      const { container } = render(
        <InTableSearchHighlightsWrapper inTableSearchTerm="." {...colors}>
          <div>test this now.</div>
        </InTableSearchHighlightsWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('.')).toHaveLength(1);
      });

      expect(container.innerHTML).toMatchInlineSnapshot(
        `"<div><div>test this now<mark style=\\"color: black; background-color: green;\\" class=\\"dataGridInTableSearch__match\\" data-match-index=\\"0\\">.</mark></div></div>"`
      );
    });

    it('with no search term', async () => {
      const { container } = render(
        <InTableSearchHighlightsWrapper {...colors}>
          <div>test</div>
        </InTableSearchHighlightsWrapper>
      );

      expect(container.innerHTML).toMatchInlineSnapshot(`"<div><div>test</div></div>"`);
    });
  });

  describe('does not modify the DOM and only counts search matches (dry run)', () => {
    it('with matches', async () => {
      const onHighlightsCountFound = jest.fn();
      const { container } = render(
        <InTableSearchHighlightsWrapper
          inTableSearchTerm="test"
          onHighlightsCountFound={onHighlightsCountFound}
          {...colors}
        >
          <div>
            Some text here with test and test and even more Test to be sure
            <div>test</div>
            <div>this</div>
            <img src="https://test.com" alt="not for test" />
          </div>
        </InTableSearchHighlightsWrapper>
      );

      await waitFor(() => {
        expect(onHighlightsCountFound).toHaveBeenCalledWith(4);
      });

      expect(container.innerHTML).toMatchInlineSnapshot(
        `"<div><div>Some text here with test and test and even more Test to be sure<div>test</div><div>this</div><img src=\\"https://test.com\\" alt=\\"not for test\\"></div></div>"`
      );
    });

    it('with single match', async () => {
      const onHighlightsCountFound = jest.fn();

      const { container } = render(
        <InTableSearchHighlightsWrapper
          inTableSearchTerm="test2"
          onHighlightsCountFound={onHighlightsCountFound}
          {...colors}
        >
          <div>test2</div>
        </InTableSearchHighlightsWrapper>
      );

      await waitFor(() => {
        expect(onHighlightsCountFound).toHaveBeenCalledWith(1);
      });

      expect(container.innerHTML).toMatchInlineSnapshot(`"<div><div>test2</div></div>"`);
    });

    it('with no matches', async () => {
      const onHighlightsCountFound = jest.fn();
      const { container } = render(
        <InTableSearchHighlightsWrapper
          inTableSearchTerm="test3"
          onHighlightsCountFound={onHighlightsCountFound}
          {...colors}
        >
          <div>test2</div>
        </InTableSearchHighlightsWrapper>
      );

      await waitFor(() => {
        expect(onHighlightsCountFound).toHaveBeenCalledWith(0);
      });

      expect(container.innerHTML).toMatchInlineSnapshot(`"<div><div>test2</div></div>"`);
    });

    it('with no search term', async () => {
      const onHighlightsCountFound = jest.fn();
      const { container } = render(
        <InTableSearchHighlightsWrapper onHighlightsCountFound={onHighlightsCountFound} {...colors}>
          <div>test</div>
        </InTableSearchHighlightsWrapper>
      );

      expect(container.innerHTML).toMatchInlineSnapshot(`"<div><div>test</div></div>"`);
      expect(onHighlightsCountFound).not.toHaveBeenCalled();
    });
  });
});
