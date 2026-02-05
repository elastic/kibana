/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Template } from './template';
import type { RenderingMetadata } from '../types';

const createMockMetadata = (
  overrides: Partial<RenderingMetadata> = {}
): RenderingMetadata => ({
  hardenPrototypes: false,
  strictCsp: false,
  uiPublicUrl: '/ui',
  bootstrapScriptUrl: '/bootstrap.js',
  locale: 'en',
  themeVersion: 'v8',
  darkMode: false,
  stylesheetPaths: [],
  scriptPaths: [],
  injectedMetadata: {
    theme: { name: 'amsterdam' },
  } as any,
  customBranding: {},
  ...overrides,
});

describe('Template', () => {
  describe('Valentine period logo', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders the Heart icon during Valentine period (Feb 1-14)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 1, 5)); // Feb 5

      const markup = renderToStaticMarkup(
        <Template metadata={createMockMetadata()} />
      );

      expect(markup).toContain('kbnElasticHeartClip');
      expect(markup).not.toContain('logoElastic');

      jest.useRealTimers();
    });

    it('renders the Heart icon on Feb 1 (start of period)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 1, 1)); // Feb 1

      const markup = renderToStaticMarkup(
        <Template metadata={createMockMetadata()} />
      );

      expect(markup).toContain('kbnElasticHeartClip');
      jest.useRealTimers();
    });

    it('renders the Heart icon on Feb 14 (end of period)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 1, 14)); // Feb 14

      const markup = renderToStaticMarkup(
        <Template metadata={createMockMetadata()} />
      );

      expect(markup).toContain('kbnElasticHeartClip');
      jest.useRealTimers();
    });

    it('renders the standard Logo outside Valentine period', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 2, 1)); // Mar 1

      const markup = renderToStaticMarkup(
        <Template metadata={createMockMetadata()} />
      );

      expect(markup).not.toContain('kbnElasticHeartClip');
      jest.useRealTimers();
    });

    it('renders the standard Logo on Feb 15 (day after period)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 1, 15)); // Feb 15

      const markup = renderToStaticMarkup(
        <Template metadata={createMockMetadata()} />
      );

      expect(markup).not.toContain('kbnElasticHeartClip');
      jest.useRealTimers();
    });

    it('renders the standard Logo on Jan 31 (day before period)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 0, 31)); // Jan 31

      const markup = renderToStaticMarkup(
        <Template metadata={createMockMetadata()} />
      );

      expect(markup).not.toContain('kbnElasticHeartClip');
      jest.useRealTimers();
    });

    it('uses custom branding logo over Heart icon even during Valentine period', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 1, 10)); // Feb 10

      const markup = renderToStaticMarkup(
        <Template
          metadata={createMockMetadata({ customBranding: { logo: 'https://example.com/logo.png' } })}
        />
      );

      expect(markup).not.toContain('kbnElasticHeartClip');
      expect(markup).toContain('https://example.com/logo.png');
      jest.useRealTimers();
    });
  });
});
