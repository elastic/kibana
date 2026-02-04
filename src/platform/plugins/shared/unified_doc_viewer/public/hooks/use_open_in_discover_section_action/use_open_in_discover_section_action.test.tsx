/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  OPEN_IN_DISCOVER_LABEL,
  OPEN_IN_DISCOVER_ARIA_LABEL,
} from '../../components/observability/traces/common/constants';
import { DocViewerExtensionActionsProvider } from '../use_doc_viewer_extension_actions';
import { useOpenInDiscoverSectionAction } from '.';

describe('useOpenInDiscoverSectionAction', () => {
  const tabLabel = 'Some section';
  const dataTestSubj = 'openInDiscover';

  it('returns undefined when href is missing and openInNewTab cannot be used', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocViewerExtensionActionsProvider actions={undefined}>
        {children}
      </DocViewerExtensionActionsProvider>
    );

    const { result } = renderHook(
      () =>
        useOpenInDiscoverSectionAction({
          href: undefined,
          esql: undefined,
          tabLabel,
          dataTestSubj,
        }),
      { wrapper }
    );

    expect(result.current).toBeUndefined();
  });

  it('returns an href action without onClick when only href is provided', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocViewerExtensionActionsProvider actions={undefined}>
        {children}
      </DocViewerExtensionActionsProvider>
    );

    const href = 'http://discover/url';
    const { result } = renderHook(
      () =>
        useOpenInDiscoverSectionAction({
          href,
          esql: undefined,
          tabLabel,
          dataTestSubj,
        }),
      { wrapper }
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        href,
        label: OPEN_IN_DISCOVER_LABEL,
        ariaLabel: OPEN_IN_DISCOVER_ARIA_LABEL,
        icon: 'discoverApp',
        dataTestSubj,
        onClick: undefined,
      })
    );
  });

  it('returns an action with onClick (no href) when openInNewTab is available and esql is provided', () => {
    const openInNewTab = jest.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocViewerExtensionActionsProvider actions={{ openInNewTab }}>
        {children}
      </DocViewerExtensionActionsProvider>
    );

    const esql = 'FROM traces-* | WHERE trace.id == "abc123"';
    const { result } = renderHook(
      () =>
        useOpenInDiscoverSectionAction({
          href: undefined,
          esql,
          tabLabel,
          dataTestSubj,
        }),
      { wrapper }
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        label: OPEN_IN_DISCOVER_LABEL,
        ariaLabel: OPEN_IN_DISCOVER_ARIA_LABEL,
        icon: 'discoverApp',
        dataTestSubj,
        onClick: expect.any(Function),
      })
    );

    result.current?.onClick?.();

    expect(openInNewTab).toHaveBeenCalledWith({
      query: { esql },
      tabLabel,
    });
  });

  it('returns an href action with onClick when href and openInNewTab+esql are provided', () => {
    const openInNewTab = jest.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocViewerExtensionActionsProvider actions={{ openInNewTab }}>
        {children}
      </DocViewerExtensionActionsProvider>
    );

    const href = 'http://discover/url';
    const esql = 'FROM traces-* | WHERE trace.id == "abc123"';
    const { result } = renderHook(
      () =>
        useOpenInDiscoverSectionAction({
          href,
          esql,
          tabLabel,
          dataTestSubj,
        }),
      { wrapper }
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        href,
        label: OPEN_IN_DISCOVER_LABEL,
        ariaLabel: OPEN_IN_DISCOVER_ARIA_LABEL,
        icon: 'discoverApp',
        dataTestSubj,
        onClick: expect.any(Function),
      })
    );

    result.current?.onClick?.();
    expect(openInNewTab).toHaveBeenCalledWith({
      query: { esql },
      tabLabel,
    });
  });
});
