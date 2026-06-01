/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectMediaElements } from './collect_media_elements';

jest.mock('../components/edit/library/eui_icon_cache', () => ({
  identifyIconType: jest.fn().mockResolvedValue(''),
}));

describe('collectMediaElements', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('should return empty array when no source elements exist', async () => {
    root.innerHTML = '<p>hello</p>';
    expect(await collectMediaElements(root)).toEqual([]);
  });

  it('should collect img elements with src', async () => {
    root.innerHTML = '<img src="https://example.com/photo.png" />';
    const entries = await collectMediaElements(root);

    expect(entries).toHaveLength(1);
    expect(entries[0].attribute).toBe('src');
    expect(entries[0].value).toBe('https://example.com/photo.png');
    expect(entries[0].label).toBe('img');
  });

  it('should collect multiple source elements', async () => {
    root.innerHTML = `
      <img src="img1.png" />
      <video src="video.mp4"></video>
      <img src="img2.png" />
    `;
    const entries = await collectMediaElements(root);

    expect(entries).toHaveLength(3);
    expect(entries[0].label).toBe('img');
    expect(entries[1].label).toBe('video');
    expect(entries[2].label).toBe('img');
  });

  it('should collect iframe src', async () => {
    root.innerHTML = '<iframe src="https://example.com"></iframe>';
    const entries = await collectMediaElements(root);

    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe('iframe');
    expect(entries[0].value).toBe('https://example.com');
  });

  it('should collect source elements inside video', async () => {
    root.innerHTML = '<video><source src="video.mp4" /></video>';
    const entries = await collectMediaElements(root);

    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe('source');
    expect(entries[0].value).toBe('video.mp4');
  });

  it('should collect SVG image elements with href', async () => {
    root.innerHTML = '<svg><image href="icon.svg" /></svg>';
    const entries = await collectMediaElements(root);

    expect(entries).toHaveLength(1);
    expect(entries[0].attribute).toBe('href');
    expect(entries[0].label).toBe('svg image');
  });

  it('should collect SVG use elements with href', async () => {
    root.innerHTML = '<svg><use href="#my-symbol" /></svg>';
    const entries = await collectMediaElements(root);

    expect(entries).toHaveLength(1);
    expect(entries[0].attribute).toBe('href');
    expect(entries[0].label).toBe('svg use');
  });

  it('should not duplicate elements that match multiple selectors', async () => {
    root.innerHTML = '<img src="photo.png" />';
    const entries = await collectMediaElements(root);
    expect(entries).toHaveLength(1);
  });

  it('should include root element if it matches', async () => {
    const img = document.createElement('img');
    img.src = 'root.png';
    document.body.appendChild(img);

    const entries = await collectMediaElements(img);

    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe('root.png');

    img.remove();
  });

  it('should collect nested source elements', async () => {
    root.innerHTML = `
      <div>
        <div>
          <img src="deep.png" />
        </div>
      </div>
    `;
    const entries = await collectMediaElements(root);

    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe('deep.png');
  });
});
