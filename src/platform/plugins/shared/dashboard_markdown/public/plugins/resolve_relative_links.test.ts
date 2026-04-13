/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Root, Link } from 'mdast';
import { resolveRelativeLinksPlugin } from './resolve_relative_links';

const createLinkNode = (url: string): Link => ({
  type: 'link',
  url,
  children: [{ type: 'text', value: 'link text' }],
});

const createTree = (...links: Link[]): Root => ({
  type: 'root',
  children: [
    {
      type: 'paragraph',
      children: links,
    },
  ],
});

const getLink = (tree: Root, index: number = 0): Link =>
  (tree.children[0] as any).children[index] as Link;

const setLocation = (url: string) => {
  Object.defineProperty(window, 'location', {
    value: new URL(url),
    writable: true,
  });
};

describe('resolveRelativeLinksPlugin', () => {
  it('resolves document relative links against the current URL', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode('discover'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/app/discover');
  });

  it('resolves document relative links within a space', () => {
    setLocation('http://localhost:5601/s/my-space/app/dashboards');
    const tree = createTree(createLinkNode('discover'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/s/my-space/app/discover');
  });

  it('preserves hash fragments in document relative links', () => {
    setLocation('http://localhost:5601/s/cool-space/app/dashboards');
    const tree = createTree(createLinkNode('discover#/view/my-saved-search'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/s/cool-space/app/discover#/view/my-saved-search');
  });

  it('resolves relative links from non-/app/ paths', () => {
    setLocation('http://localhost:5601/some/other/path');
    const tree = createTree(createLinkNode('sibling'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/some/other/sibling');
  });

  it('resolves the same way with or without a trailing slash on the URL', () => {
    setLocation('http://localhost:5601/s/my-space/app/dashboards/');
    const tree = createTree(createLinkNode('discover'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/s/my-space/app/discover');
  });

  it('resolves ../ parent traversal links', () => {
    setLocation('http://localhost:5601/s/my-space/app/dashboards');
    const tree = createTree(createLinkNode('../security/account'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/s/my-space/security/account');
  });

  it('resolves multiple levels of ../ traversal', () => {
    setLocation('http://localhost:5601/s/my-space/app/dashboards');
    const tree = createTree(createLinkNode('../../other-path'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/s/other-path');
  });

  it('resolves ./ current directory links', () => {
    setLocation('http://localhost:5601/s/my-space/app/dashboards');
    const tree = createTree(createLinkNode('./discover'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/s/my-space/app/discover');
  });

  it('does not modify absolute URLs with protocols', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode('https://example.com'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('https://example.com');
  });

  it('does not modify slash-prefixed relative URLs', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode('/app/discover'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('/app/discover');
  });

  it('does not modify anchor-only links', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode('#section'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('#section');
  });

  it('does not modify query-only links', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode('?foo=bar'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('?foo=bar');
  });

  it('does not modify mailto links', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode('mailto:test@example.com'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('mailto:test@example.com');
  });

  it('does not modify http links', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode('http://example.com'));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('http://example.com');
  });

  it('handles multiple links in one tree', () => {
    setLocation('http://localhost:5601/s/test/app/dashboards');
    const tree = createTree(
      createLinkNode('discover'),
      createLinkNode('https://elastic.co'),
      createLinkNode('maps')
    );
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree, 0).url).toBe('/s/test/app/discover');
    expect(getLink(tree, 1).url).toBe('https://elastic.co');
    expect(getLink(tree, 2).url).toBe('/s/test/app/maps');
  });

  it('does not modify empty URLs', () => {
    setLocation('http://localhost:5601/app/dashboards');
    const tree = createTree(createLinkNode(''));
    resolveRelativeLinksPlugin()()(tree);

    expect(getLink(tree).url).toBe('');
  });
});
