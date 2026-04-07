/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';

import {
  getDataUrlFromReactComponent,
  getIconBase64,
  getTriggerBoltFallbackDataUrl,
  resolveIconToDataUrl,
} from './get_icon_base64';
import { getStepIconType } from './get_step_icon_type';
import { HardcodedIcons } from './hardcoded_icons';

// Mock renderToStaticMarkup from react-dom/server
jest.mock('react-dom/server', () => ({
  renderToStaticMarkup: jest.fn(),
}));

// Mock the SVG component imports - they are React components
jest.mock('./icons/elasticsearch.svg', () => ({
  ElasticsearchLogo: () => 'ElasticsearchLogo',
}));
jest.mock('./icons/kibana.svg', () => ({
  KibanaLogo: () => 'KibanaLogo',
}));

const { renderToStaticMarkup } = jest.requireMock('react-dom/server') as {
  renderToStaticMarkup: jest.Mock;
};

const FALLBACK_URL = 'data:image/svg+xml;base64,ZmFsbGJhY2s=';

describe('getDataUrlFromReactComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('converts an SVG component to a base64 data URL', () => {
    const svgMarkup = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>';
    renderToStaticMarkup.mockReturnValue(svgMarkup);

    const DummyComponent: React.FC<{ width: number; height: number }> = () => null;
    const result = getDataUrlFromReactComponent(DummyComponent, FALLBACK_URL);

    expect(result).toBe(`data:image/svg+xml;base64,${btoa(svgMarkup)}`);
    expect(renderToStaticMarkup).toHaveBeenCalledTimes(1);
  });

  it('extracts data: src from img tags', () => {
    const dataUrl = 'data:image/png;base64,abc123';
    renderToStaticMarkup.mockReturnValue(`<img src="${dataUrl}" alt="icon"/>`);

    const DummyComponent: React.FC<{ width: number; height: number }> = () => null;
    const result = getDataUrlFromReactComponent(DummyComponent, FALLBACK_URL);

    expect(result).toBe(dataUrl);
  });

  it('returns fallback when img tag has a non-data src', () => {
    renderToStaticMarkup.mockReturnValue('<img src="https://example.com/icon.png" alt="icon"/>');

    const DummyComponent: React.FC<{ width: number; height: number }> = () => null;
    const result = getDataUrlFromReactComponent(DummyComponent, FALLBACK_URL);

    expect(result).toBe(FALLBACK_URL);
  });

  it('replaces fill="none" with fill="currentColor" on the root SVG', () => {
    renderToStaticMarkup.mockReturnValue(
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none"><path fill="none" d="M0 0"/></svg>'
    );

    const DummyComponent: React.FC<{ width: number; height: number }> = () => null;
    const result = getDataUrlFromReactComponent(DummyComponent, FALLBACK_URL);

    // fill="none" should be removed and fill="currentColor" added to <svg>
    const decoded = atob(result.replace('data:image/svg+xml;base64,', ''));
    expect(decoded).not.toContain('fill="none"');
    expect(decoded).toContain('fill="currentColor"');
  });

  it('returns fallback when renderToStaticMarkup throws', () => {
    renderToStaticMarkup.mockImplementation(() => {
      throw new Error('render failed');
    });

    const DummyComponent: React.FC<{ width: number; height: number }> = () => null;
    const result = getDataUrlFromReactComponent(DummyComponent, FALLBACK_URL);

    expect(result).toBe(FALLBACK_URL);
  });
});

describe('resolveIconToDataUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns fallback when icon is undefined', async () => {
    const result = await resolveIconToDataUrl(undefined, FALLBACK_URL);
    expect(result).toBe(FALLBACK_URL);
  });

  it('returns the icon directly when it is a data: string', async () => {
    const dataUrl = 'data:image/svg+xml;base64,abc123';
    const result = await resolveIconToDataUrl(dataUrl, FALLBACK_URL);
    expect(result).toBe(dataUrl);
  });

  it('returns fallback for a non-data string icon', async () => {
    const result = await resolveIconToDataUrl('some-icon-name', FALLBACK_URL);
    expect(result).toBe(FALLBACK_URL);
  });

  it('resolves a function component icon to a data URL', async () => {
    const svgMarkup = '<svg><rect/></svg>';
    renderToStaticMarkup.mockReturnValue(svgMarkup);

    const IconComponent: React.FC = () => null;
    const result = await resolveIconToDataUrl(IconComponent, FALLBACK_URL);

    expect(result).toBe(`data:image/svg+xml;base64,${btoa(svgMarkup)}`);
  });

  it('resolves a lazy exotic component to a data URL', async () => {
    const svgMarkup = '<svg><circle/></svg>';
    renderToStaticMarkup.mockReturnValue(svgMarkup);

    const InnerComponent: React.FC<{ width: number; height: number }> = () => null;

    // Create a fake lazy component that matches isLazyExoticComponent
    const lazyComponent = {
      $$typeof: Symbol.for('react.lazy'),
      _payload: {
        _result: jest.fn().mockResolvedValue({ default: InnerComponent }),
      },
    };

    const result = await resolveIconToDataUrl(
      lazyComponent as unknown as React.ComponentType,
      FALLBACK_URL
    );

    expect(result).toBe(`data:image/svg+xml;base64,${btoa(svgMarkup)}`);
    expect(lazyComponent._payload._result).toHaveBeenCalledTimes(1);
  });
});

describe('getIconBase64', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the module-level cache between tests by re-importing
    // We cannot clear the cache directly so we test caching behavior sequentially
  });

  describe('trigger icons', () => {
    it('returns the resolved icon for a trigger with an icon', async () => {
      const dataUrl = 'data:image/svg+xml;base64,dHJpZ2dlcg==';
      const result = await getIconBase64({
        actionTypeId: 'unique-trigger-id-1',
        icon: dataUrl,
        kind: 'trigger',
      });

      expect(result).toBe(dataUrl);
    });

    it('returns HardcodedIcons.trigger as fallback when no icon is provided for a trigger', async () => {
      const result = await getIconBase64({
        actionTypeId: 'unique-trigger-id-2',
        kind: 'trigger',
      });

      expect(result).toBe(HardcodedIcons.trigger);
    });

    it('caches trigger icons by actionTypeId', async () => {
      const dataUrl = 'data:image/svg+xml;base64,Y2FjaGVk';
      const cacheTestId = 'cache-test-trigger-id';

      const result1 = await getIconBase64({
        actionTypeId: cacheTestId,
        icon: dataUrl,
        kind: 'trigger',
      });

      // Second call with a different icon should return cached value
      const result2 = await getIconBase64({
        actionTypeId: cacheTestId,
        icon: 'data:image/svg+xml;base64,ZGlmZmVyZW50',
        kind: 'trigger',
      });

      expect(result1).toBe(dataUrl);
      expect(result2).toBe(dataUrl);
    });
  });

  describe('step icons', () => {
    it('returns the resolved icon when icon is provided for unknown actionTypeId', async () => {
      const dataUrl = 'data:image/svg+xml;base64,c3RlcA==';
      const result = await getIconBase64({
        actionTypeId: '.custom-connector',
        icon: dataUrl,
        kind: 'step',
      });

      expect(result).toBe(dataUrl);
    });

    it('prefers hardcoded icon over icon param for known actionTypeIds', async () => {
      const result = await getIconBase64({
        actionTypeId: '.slack',
        icon: 'logoSlack',
        kind: 'step',
      });

      expect(result).toBe(HardcodedIcons['.slack']);
    });

    it('prefers hardcoded icon for email over EUI name string', async () => {
      const result = await getIconBase64({
        actionTypeId: '.email',
        icon: 'email',
        kind: 'step',
      });

      expect(result).toBe(HardcodedIcons['.email']);
    });

    it('prefers hardcoded icon for inference over EUI name string', async () => {
      const result = await getIconBase64({
        actionTypeId: '.inference',
        icon: 'sparkles',
        kind: 'step',
      });

      expect(result).toBe(HardcodedIcons['.inference']);
    });

    it('returns hardcoded icon when actionTypeId matches a known type without icon', async () => {
      const result = await getIconBase64({
        actionTypeId: '.slack',
        kind: 'step',
      });

      expect(result).toBe(HardcodedIcons['.slack']);
    });

    it('returns plugs fallback for unknown actionTypeId without icon', async () => {
      const result = await getIconBase64({
        actionTypeId: 'unknown-action-type',
        kind: 'step',
      });

      expect(result).toBe(HardcodedIcons.default);
    });

    it('returns HardcodedIcons.kibana as fallback when fromRegistry is true', async () => {
      const result = await getIconBase64({
        actionTypeId: 'some-registry-step',
        kind: 'step',
        fromRegistry: true,
      });

      expect(result).toBe(HardcodedIcons.kibana);
    });

    it('handles elasticsearch actionTypeId', async () => {
      renderToStaticMarkup.mockReturnValue('<svg><rect/></svg>');

      const result = await getIconBase64({
        actionTypeId: 'elasticsearch',
        kind: 'step',
      });

      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('handles kibana actionTypeId', async () => {
      renderToStaticMarkup.mockReturnValue('<svg><rect/></svg>');

      const result = await getIconBase64({
        actionTypeId: 'kibana',
        kind: 'step',
      });

      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });
});

describe('getTriggerBoltFallbackDataUrl', () => {
  it('returns HardcodedIcons.trigger', () => {
    expect(getTriggerBoltFallbackDataUrl()).toBe(HardcodedIcons.trigger);
  });
});

describe('getIconBase64 – every HardcodedIcons entry resolves to its hardcoded value', () => {
  const NON_STEP_KEYS = ['trigger', 'flask', 'beta', 'default'];
  const REACT_COMPONENT_KEYS = ['elasticsearch', 'kibana'];

  const stepEntries = Object.entries(HardcodedIcons).filter(
    ([key]) => !NON_STEP_KEYS.includes(key) && !REACT_COMPONENT_KEYS.includes(key)
  );

  it.each(stepEntries)(
    'returns hardcoded icon for actionTypeId "%s"',
    async (actionTypeId, expectedIcon) => {
      const result = await getIconBase64({ actionTypeId, kind: 'step' });
      expect(result).toBe(expectedIcon);
    }
  );
});

describe('getIconBase64 – hardcoded icon wins over EUI name strings', () => {
  const casesWithEuiNames: Array<[string, string]> = [
    ['.slack', 'logoSlack'],
    ['.slack_api', 'logoSlack'],
    ['.email', 'mail'],
    ['.inference', 'sparkles'],
    ['console', 'commandLine'],
    ['if', 'branch'],
    ['foreach', 'refresh'],
    ['while', 'refresh'],
    ['switch', 'productStreamsWired'],
    ['wait', 'clock'],
    ['waitForInput', 'user'],
    ['alert', 'warning'],
    ['scheduled', 'clock'],
    ['manual', 'user'],
    ['data.set', 'database'],
  ];

  it.each(casesWithEuiNames)(
    'prefers hardcoded icon for "%s" over EUI icon name "%s"',
    async (actionTypeId, euiIconName) => {
      const result = await getIconBase64({
        actionTypeId,
        icon: euiIconName,
        kind: 'step',
      });
      expect(result).toBe(HardcodedIcons[actionTypeId]);
    }
  );
});

describe('getIconBase64 – error handling', () => {
  it('returns plugs fallback for unknown connector with non-resolvable EUI icon name', async () => {
    const result = await getIconBase64({
      actionTypeId: '.some-broken-connector',
      icon: 'nonExistentEuiIcon',
      kind: 'step',
    });

    expect(result).toBe(HardcodedIcons.default);
  });

  it('returns kibana fallback for registry step with non-resolvable icon', async () => {
    const result = await getIconBase64({
      actionTypeId: 'some-registry-step',
      icon: 'nonExistentEuiIcon',
      kind: 'step',
      fromRegistry: true,
    });

    expect(result).toBe(HardcodedIcons.kibana);
  });

  it('returns bolt fallback for trigger with non-resolvable icon', async () => {
    const result = await getIconBase64({
      actionTypeId: 'broken-trigger-unique-2',
      icon: 'nonExistentEuiIcon',
      kind: 'trigger',
    });

    expect(result).toBe(HardcodedIcons.trigger);
  });

  it('returns plugs fallback when icon is a throwing function component', async () => {
    renderToStaticMarkup.mockImplementation(() => {
      throw new Error('render failed');
    });

    const BrokenComponent: React.FC = () => null;
    const result = await getIconBase64({
      actionTypeId: '.another-broken-connector',
      icon: BrokenComponent,
      kind: 'step',
    });

    expect(result).toBe(HardcodedIcons.default);
  });
});

describe('getStepIconType and getIconBase64 consistency', () => {
  const stepTypesInBothPaths = [
    'console',
    'data.set',
    'foreach',
    'while',
    'switch',
    'if',
    'wait',
    'waitForInput',
    'workflow.execute',
    'workflow.executeAsync',
    'workflow.output',
    'workflow.fail',
  ];

  it.each(stepTypesInBothPaths)(
    '"%s" resolves to a non-fallback icon in both getStepIconType and getIconBase64',
    async (stepType) => {
      const euiIcon = getStepIconType(stepType);
      expect(euiIcon).not.toBe('plugs');
      expect(euiIcon).not.toBe('info');

      const dataUrl = await getIconBase64({ actionTypeId: stepType, kind: 'step' });
      expect(dataUrl).toBe(HardcodedIcons[stepType]);
      expect(HardcodedIcons[stepType]).toBeDefined();
    }
  );

  const triggerOnlyTypes = ['alert', 'scheduled', 'manual'];

  it.each(triggerOnlyTypes)(
    '"%s" has a hardcoded icon but is not in getStepIconType (trigger-only type)',
    async (stepType) => {
      expect(HardcodedIcons[stepType]).toBeDefined();

      const dataUrl = await getIconBase64({ actionTypeId: stepType, kind: 'step' });
      expect(dataUrl).toBe(HardcodedIcons[stepType]);
    }
  );

  it('http resolves in getStepIconType but falls back in getIconBase64 (no hardcoded entry)', async () => {
    const euiIcon = getStepIconType('http');
    expect(euiIcon).toBe('globe');

    expect(HardcodedIcons.http).toBeUndefined();

    const dataUrl = await getIconBase64({ actionTypeId: 'http', kind: 'step' });
    expect(dataUrl).toBe(HardcodedIcons.default);
  });
});
