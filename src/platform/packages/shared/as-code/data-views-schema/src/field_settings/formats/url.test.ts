/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatSchema } from './format_schema';

describe('formatSchema', () => {
  describe('url format', () => {
    it('is valid for link subtype', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: {
          type: 'a',
          url_template: 'https://example.com/{{value}}',
          label_template: 'View {{value}}',
          open_link_in_current_tab: true,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'url',
        params: {
          type: 'a',
          url_template: 'https://example.com/{{value}}',
          label_template: 'View {{value}}',
          open_link_in_current_tab: true,
        },
      });
    });

    it('is valid for img subtype', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: {
          type: 'img',
          url_template: 'https://cdn.example.com/{{value}}.png',
          width: 128,
          height: 64,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'url',
        params: {
          type: 'img',
          url_template: 'https://cdn.example.com/{{value}}.png',
          width: 128,
          height: 64,
        },
      });
    });

    it('is valid for audio subtype', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: {
          type: 'audio',
          url_template: 'https://audio.example.com/{{value}}.mp3',
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'url',
        params: {
          type: 'audio',
          url_template: 'https://audio.example.com/{{value}}.mp3',
        },
      });
    });

    it('is valid without params', () => {
      const result = formatSchema.safeParse({
        type: 'url',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'url',
      });
    });

    it('is valid with null params', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: null,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'url',
        params: null,
      });
    });

    it('is valid with null optional params', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: {
          type: 'a',
          url_template: null,
          label_template: null,
          open_link_in_current_tab: null,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'url',
        params: {
          type: 'a',
          url_template: null,
          label_template: null,
          open_link_in_current_tab: null,
        },
      });
    });

    it('is valid with null image dimensions', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: {
          type: 'img',
          url_template: null,
          label_template: null,
          width: null,
          height: null,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: 'url',
        params: {
          type: 'img',
          url_template: null,
          label_template: null,
          width: null,
          height: null,
        },
      });
    });

    it('returns an error when the type discriminator is missing', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: {
          url_template: 'https://example.com/{{value}}',
        },
      });
      expect(result.success).toBe(false);
    });

    it('returns an error for invalid params', () => {
      const result = formatSchema.safeParse({
        type: 'url',
        params: {
          type: 'img',
          width: '128',
        },
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('expected number');
    });
  });
});
