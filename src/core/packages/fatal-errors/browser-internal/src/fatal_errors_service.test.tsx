/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import React, { type ReactElement, type ReactNode } from 'react';
import { render as reactDomRender } from 'react-dom';
import { render } from '@testing-library/react';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';

import { FatalErrorsService } from './fatal_errors_service';

vi.mock('react-dom', () => {
  const actual = require('react-dom');
  const mocked = { ...actual, render: vi.fn(actual.render) };
  return { ...mocked, default: mocked };
});

describe('FatalErrorsService', () => {
  let fatalErrorsSetup: FatalErrorsSetup;
  let analytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceStart>;
  let i18n: ReturnType<typeof i18nServiceMock.createStartContract>;
  let injectedMetadata: ReturnType<typeof injectedMetadataServiceMock.createSetupContract>;
  let rootDomElement: HTMLElement;
  let stopCoreSystem: Mock;
  let theme: ReturnType<typeof themeServiceMock.createSetupContract>;

  beforeEach(() => {
    rootDomElement = document.createElement('div');
    analytics = analyticsServiceMock.createAnalyticsServiceStart();
    i18n = i18nServiceMock.createStartContract();
    injectedMetadata = injectedMetadataServiceMock.createSetupContract();
    theme = themeServiceMock.createSetupContract();
    stopCoreSystem = vi.fn();

    const fatalErrorsService = new FatalErrorsService(rootDomElement, stopCoreSystem);

    fatalErrorsSetup = fatalErrorsService.setup({ analytics, injectedMetadata, i18n, theme });
  });

  describe('add', () => {
    it('should call the `stopCoreSystem` param', () => {
      expect(stopCoreSystem).not.toHaveBeenCalled();
      expect(() => fatalErrorsSetup.add(new Error('foo'))).toThrow();
      expect(stopCoreSystem).toHaveBeenCalledWith();
    });

    describe('when rendering', () => {
      let element: ReactElement;
      let condition: MockedFunction<() => boolean>;
      let handler: MockedFunction<() => ReactNode>;

      beforeEach(() => {
        rootDomElement.innerHTML = `
          <h1>Loading...</h1>
          <div class="someSpinner"></div>
        `;

        condition = vi.fn();
        handler = vi.fn(() => <div data-test-subj="customError" />);
        fatalErrorsSetup.catch(condition, handler);

        const renderSpy = vi.mocked(reactDomRender).mockImplementation(() => {});
        expect(() => fatalErrorsSetup.add(new Error('foo'))).toThrow();
        [element] = renderSpy.mock.lastCall as unknown as [ReactElement];
      });

      afterEach(() => {
        vi.resetAllMocks();
      });

      it('should clean up the root element', async () => {
        expect(rootDomElement).toMatchInlineSnapshot(`
          <div>
            <div />
          </div>
        `);
      });

      it('should render a generic error screen', async () => {
        expect(render(element).queryByTestId('fatalErrorScreen')).toBeTruthy();
      });

      it('should render a custom error', async () => {
        expect(() => fatalErrorsSetup.add(new Error('bar'))).toThrow();
        condition.mockReturnValue(true);
        expect(render(element).queryByTestId('customError')).toBeTruthy();
        expect(condition).toHaveBeenCalledTimes(2);
        expect(condition).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ error: new Error('foo') })
        );
        expect(condition).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ error: new Error('bar') })
        );
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith([
          expect.objectContaining({ error: new Error('foo') }),
          expect.objectContaining({ error: new Error('bar') }),
        ]);
      });

      it('should not render a custom error when errors are ambiguous', () => {
        expect(() => fatalErrorsSetup.add(new Error('bar'))).toThrow();
        condition.mockReturnValueOnce(true);
        expect(render(element).queryByTestId('customError')).toBeFalsy();
      });
    });
  });
});
