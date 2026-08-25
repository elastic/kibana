/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';
import type { NavExtensionRenderContext } from '@kbn/ui-side-navigation';
import type { NavExtensionRuntimeDefinition, NavExtensionSlotData } from '@kbn/core-chrome-browser';
import { TestChromeProviders } from '../../../../test_helpers';
import { useRenderNavExtensionPoint } from './template_host';

jest.mock('@kbn/shared-ux-navigation-extension-templates', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return {
    TEMPLATES: {
      list: ({ data, config, context }: { data: unknown; config: unknown; context: unknown }) =>
        createElement('div', {
          'data-test-subj': 'mock-list-template',
          'data-data': JSON.stringify(data ?? null),
          'data-config': JSON.stringify(config ?? null),
          'data-context': JSON.stringify(context),
        }),
    },
  };
});

const SLOT_ID = 'recent-dashboards';
const EXTENSION_ID = 'recentlyAccessedDashboards';

const baseContext: NavExtensionRenderContext = {
  primaryItemId: 'dashboards',
  sectionId: 'dashboards-section',
  surface: 'sidePanel',
};

const definition: NavExtensionRuntimeDefinition = {
  id: EXTENSION_ID,
  templateId: 'list',
  config: { max: 2 },
};

const defaultExtensionData: NavExtensionSlotData = [{ id: '1', label: 'Row', href: '/row' }];

interface RenderExtensionPointOptions {
  slotId?: string;
  extensionId?: string;
  context?: NavExtensionRenderContext;
  chrome: InternalChromeStart;
}

const ExtensionPoint = ({
  slotId = SLOT_ID,
  extensionId = EXTENSION_ID,
  context = baseContext,
}: Omit<RenderExtensionPointOptions, 'chrome'>) => {
  const renderExtensionPoint = useRenderNavExtensionPoint();
  return <>{renderExtensionPoint(slotId, extensionId, context)}</>;
};

const renderExtensionPointHost = ({
  slotId = SLOT_ID,
  extensionId = EXTENSION_ID,
  context = baseContext,
  chrome,
}: RenderExtensionPointOptions) =>
  render(
    <TestChromeProviders chrome={chrome}>
      <ExtensionPoint slotId={slotId} extensionId={extensionId} context={context} />
    </TestChromeProviders>
  );

const createChromeWithExtension = ({
  registry = { [EXTENSION_ID]: definition },
  data$ = new BehaviorSubject<NavExtensionSlotData>(defaultExtensionData),
}: {
  registry?: Record<string, NavExtensionRuntimeDefinition>;
  data$?: BehaviorSubject<NavExtensionSlotData> | Subject<NavExtensionSlotData>;
} = {}) => {
  const chrome = chromeServiceMock.createStartContract();
  chrome.project.getExtensionRegistry$.mockReturnValue(new BehaviorSubject(registry));
  chrome.project.getExtensionData$.mockImplementation((id) =>
    id === EXTENSION_ID ? data$ : undefined
  );
  return { chrome, data$ };
};

describe('useRenderNavExtensionPoint', () => {
  describe('null guards', () => {
    it('returns null when the extension definition is missing from the registry', () => {
      const { chrome } = createChromeWithExtension({ registry: {} });
      const { container } = renderExtensionPointHost({ chrome });

      expect(container).toBeEmptyDOMElement();
    });

    it('returns null when getExtensionData$ returns undefined', () => {
      const { chrome } = createChromeWithExtension();
      chrome.project.getExtensionData$.mockReturnValue(undefined);
      const { container } = renderExtensionPointHost({ chrome });

      expect(container).toBeEmptyDOMElement();
    });

    it('returns null when the template id is unknown', () => {
      const unknownDefinition: NavExtensionRuntimeDefinition = {
        id: EXTENSION_ID,
        templateId: 'unknown-template',
        config: {},
      };
      const { chrome } = createChromeWithExtension({
        registry: { [EXTENSION_ID]: unknownDefinition },
      });
      const { container } = renderExtensionPointHost({ chrome });

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId('mock-list-template')).not.toBeInTheDocument();
    });
  });

  describe('template rendering', () => {
    it('renders the resolved template', async () => {
      const { chrome } = createChromeWithExtension();
      renderExtensionPointHost({ chrome });

      expect(await screen.findByTestId('mock-list-template')).toBeInTheDocument();
    });

    it('merges slotId and extensionId into the template context', async () => {
      const { chrome } = createChromeWithExtension();
      renderExtensionPointHost({ chrome });

      const template = await screen.findByTestId('mock-list-template');
      expect(JSON.parse(template.getAttribute('data-context')!)).toEqual({
        ...baseContext,
        slotId: SLOT_ID,
        extensionId: EXTENSION_ID,
      });
    });

    it('passes the extension config to the template', async () => {
      const { chrome } = createChromeWithExtension();
      renderExtensionPointHost({ chrome });

      const template = await screen.findByTestId('mock-list-template');
      expect(JSON.parse(template.getAttribute('data-config')!)).toEqual(definition.config);
    });
  });

  describe('data subscription', () => {
    it('renders nothing until a cold observable emits', async () => {
      const data$ = new Subject<NavExtensionSlotData>();
      const { chrome } = createChromeWithExtension({ data$ });
      const { container } = renderExtensionPointHost({ chrome });

      expect(screen.queryByTestId('mock-list-template')).not.toBeInTheDocument();

      act(() => {
        data$.next([{ id: '1', label: 'Row', href: '/row' }]);
      });

      const template = await screen.findByTestId('mock-list-template');
      expect(JSON.parse(template.getAttribute('data-data')!)).toEqual([
        { id: '1', label: 'Row', href: '/row' },
      ]);
      expect(container).not.toBeEmptyDOMElement();
    });

    it('passes replayed data on first render for BehaviorSubject', async () => {
      const data$ = new BehaviorSubject<NavExtensionSlotData>(defaultExtensionData);
      const { chrome } = createChromeWithExtension({ data$ });
      renderExtensionPointHost({ chrome });

      const template = await screen.findByTestId('mock-list-template');
      expect(JSON.parse(template.getAttribute('data-data')!)).toEqual([
        { id: '1', label: 'Row', href: '/row' },
      ]);
    });

    it('updates template data when data$ emits new values', async () => {
      const data$ = new BehaviorSubject<NavExtensionSlotData>(defaultExtensionData);
      const { chrome } = createChromeWithExtension({ data$ });
      renderExtensionPointHost({ chrome });

      const template = await screen.findByTestId('mock-list-template');
      expect(JSON.parse(template.getAttribute('data-data')!)).toEqual([
        { id: '1', label: 'Row', href: '/row' },
      ]);

      act(() => {
        data$.next([
          { id: '1', label: 'Row', href: '/row' },
          { id: '2', label: 'Second row', href: '/second' },
        ]);
      });

      await waitFor(() => {
        expect(
          JSON.parse(screen.getByTestId('mock-list-template').getAttribute('data-data')!)
        ).toEqual([
          { id: '1', label: 'Row', href: '/row' },
          { id: '2', label: 'Second row', href: '/second' },
        ]);
      });
    });
  });
});
