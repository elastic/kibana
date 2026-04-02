/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Root, Link, Text } from 'mdast';
import { linkAttributesParsingPlugin } from './parsing_plugin';

interface NodeDataWithHProperties {
  hProperties?: Record<string, string>;
  [key: string]: unknown;
}

const createLinkNode = (url: string): Link => ({
  type: 'link',
  url,
  children: [{ type: 'text', value: 'link text' }],
});

const createTextNode = (value: string): Text => ({
  type: 'text',
  value,
});

const createAndParseTree = (...children: Array<Link | Text>): Root => {
  const tree: Root = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children,
      },
    ],
  };
  linkAttributesParsingPlugin()()(tree);
  return tree;
};

const getParagraphChildren = (tree: Root) => (tree.children[0] as any).children;
const getLink = (tree: Root): Link => getParagraphChildren(tree)[0];

describe('linkAttributesPlugin', () => {
  it('parses {target="_blank"} after a link with double quotes', () => {
    // [link text](https://example.com){target="_blank"}
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode('{target="_blank"}')
    );

    // <a href="https://example.com" target="_blank">link text</a>
    const link = getLink(tree);
    expect((link.data as NodeDataWithHProperties).hProperties).toEqual({ target: '_blank' });
    expect(getParagraphChildren(tree)).toHaveLength(1);
  });

  it("parses {target='_self'} with single quotes", () => {
    // [link text](https://example.com){target='_self'}
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode("{target='_self'}")
    );

    // <a href="https://example.com" target="_self">link text</a>
    expect((getLink(tree).data as NodeDataWithHProperties).hProperties).toEqual({
      target: '_self',
    });
  });

  it('parses {target=_blank} without quotes', () => {
    // [link text](https://example.com){target=_blank}
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode('{target=_blank}')
    );

    // <a href="https://example.com" target="_blank">link text</a>
    expect((getLink(tree).data as NodeDataWithHProperties).hProperties).toEqual({
      target: '_blank',
    });
  });

  it('preserves trailing text after the attribute block', () => {
    // [link text](https://example.com){target="_blank"} and some trailing text
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode('{target="_blank"} and some trailing text')
    );

    // <a href="https://example.com" target="_blank">link text</a> and some trailing text
    expect((getLink(tree).data as NodeDataWithHProperties).hProperties).toEqual({
      target: '_blank',
    });
    const children = getParagraphChildren(tree);
    expect(children).toHaveLength(2);
    expect(children[1].value).toBe(' and some trailing text');
  });

  it('ignores attributes not in the whitelist', () => {
    // [link text](https://example.com){class="evil" onclick="alert(1)" target="_blank"}
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode('{class="evil" onclick="alert(1)" target="_blank"}')
    );

    // <a href="https://example.com" target="_blank">link text</a>
    // class and onclick are silently dropped
    expect((getLink(tree).data as NodeDataWithHProperties).hProperties).toEqual({
      target: '_blank',
    });
  });

  it('leaves the attribute block as text if no whitelisted attributes are found', () => {
    // [link text](https://example.com){class="evil"}
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode('{class="evil"}')
    );

    // <a href="https://example.com">link text</a>{class="evil"}
    expect(getLink(tree).data).toBeUndefined();
    expect(getParagraphChildren(tree)).toHaveLength(2);
    expect(getParagraphChildren(tree)[1].value).toBe('{class="evil"}');
  });

  it('does not modify links without a following attribute block', () => {
    // [link text](https://example.com)
    const tree = createAndParseTree(createLinkNode('https://example.com'));

    // <a href="https://example.com">link text</a>
    expect(getLink(tree).data).toBeUndefined();
  });

  it('does not modify links followed by non-attribute text', () => {
    // [link text](https://example.com) some normal text
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode(' some normal text')
    );

    // <a href="https://example.com">link text</a> some normal text
    expect(getLink(tree).data).toBeUndefined();
    expect(getParagraphChildren(tree)).toHaveLength(2);
  });

  it('does not match unclosed curly braces', () => {
    // [link text](https://example.com){ here's some stuff without a closing brace
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode("{ here's some stuff without a closing brace")
    );

    // <a href="https://example.com">link text</a>{ here's some stuff without a closing brace
    expect(getLink(tree).data).toBeUndefined();
    expect(getParagraphChildren(tree)).toHaveLength(2);
    expect(getParagraphChildren(tree)[1].value).toBe("{ here's some stuff without a closing brace");
  });

  it('tolerates whitespace inside the curly braces', () => {
    // [link text](https://example.com){ target=_self }
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode('{ target=_self }')
    );

    // <a href="https://example.com" target="_self">link text</a>
    expect((getLink(tree).data as NodeDataWithHProperties).hProperties).toEqual({
      target: '_self',
    });
  });

  it('does not match attribute block separated from link by a space', () => {
    // [link text](https://example.com) {target="_self"}
    const tree = createAndParseTree(
      createLinkNode('https://example.com'),
      createTextNode(' {target="_self"}')
    );

    // <a href="https://example.com">link text</a> {target="_self"}
    expect(getLink(tree).data).toBeUndefined();
    expect(getParagraphChildren(tree)).toHaveLength(2);
    expect(getParagraphChildren(tree)[1].value).toBe(' {target="_self"}');
  });

  it('handles multiple links with different attributes', () => {
    // [link text](https://a.com){target="_blank"} then [link text](https://b.com){target="_self"}
    const tree = createAndParseTree(
      createLinkNode('https://a.com'),
      createTextNode('{target="_blank"} then '),
      createLinkNode('https://b.com'),
      createTextNode('{target="_self"}')
    );

    // <a href="https://a.com" target="_blank">link text</a> then
    // <a href="https://b.com" target="_self">link text</a>
    const children = getParagraphChildren(tree);
    const linkA = children[0] as Link;
    const linkB = children.find((c: any, i: number) => i > 0 && c.type === 'link') as Link;
    expect((linkA.data as NodeDataWithHProperties).hProperties).toEqual({ target: '_blank' });
    expect((linkB.data as NodeDataWithHProperties).hProperties).toEqual({ target: '_self' });
  });

  it('preserves existing node data', () => {
    // [link text](https://example.com){target="_blank"}
    // (link node pre-seeded with rel="noopener" via hProperties)
    const link = createLinkNode('https://example.com');
    link.data = { hProperties: { rel: 'noopener' } } as NodeDataWithHProperties;
    const tree = createAndParseTree(link, createTextNode('{target="_blank"}'));

    // <a href="https://example.com" rel="noopener" target="_blank">link text</a>
    expect((getLink(tree).data as NodeDataWithHProperties).hProperties).toEqual({
      rel: 'noopener',
      target: '_blank',
    });
  });
});
