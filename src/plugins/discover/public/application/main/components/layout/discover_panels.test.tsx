/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount } from 'enzyme';
import React, { ReactElement, RefObject } from 'react';
import { DiscoverPanels, DISCOVER_PANELS_MODE } from './discover_panels';
import { DiscoverPanelsResizable } from './discover_panels_resizable';
import { DiscoverPanelsFixed } from './discover_panels_fixed';

describe('Discover panels component', () => {
  const mountComponent = ({
    mode = DISCOVER_PANELS_MODE.RESIZABLE,
    resizeRef = { current: null },
    initialTopPanelHeight = 200,
    minTopPanelHeight = 100,
    minMainPanelHeight = 100,
    topPanel = <></>,
    mainPanel = <></>,
  }: {
    mode?: DISCOVER_PANELS_MODE;
    resizeRef?: RefObject<HTMLDivElement>;
    initialTopPanelHeight?: number;
    minTopPanelHeight?: number;
    minMainPanelHeight?: number;
    mainPanel?: ReactElement;
    topPanel?: ReactElement;
  }) => {
    return mount(
      <DiscoverPanels
        mode={mode}
        resizeRef={resizeRef}
        topPanelHeight={initialTopPanelHeight}
        minTopPanelHeight={minTopPanelHeight}
        minMainPanelHeight={minMainPanelHeight}
        topPanel={topPanel}
        mainPanel={mainPanel}
        onTopPanelHeightChange={jest.fn()}
      />
    );
  };

  it('should show DiscoverPanelsFixed when mode is DISCOVER_PANELS_MODE.SINGLE', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: DISCOVER_PANELS_MODE.SINGLE, topPanel, mainPanel });
    expect(component.find(DiscoverPanelsFixed).exists()).toBe(true);
    expect(component.find(DiscoverPanelsResizable).exists()).toBe(false);
    expect(component.contains(topPanel)).toBe(false);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should show DiscoverPanelsFixed when mode is DISCOVER_PANELS_MODE.FIXED', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: DISCOVER_PANELS_MODE.FIXED, topPanel, mainPanel });
    expect(component.find(DiscoverPanelsFixed).exists()).toBe(true);
    expect(component.find(DiscoverPanelsResizable).exists()).toBe(false);
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should show DiscoverPanelsResizable when mode is DISCOVER_PANELS_MODE.RESIZABLE', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: DISCOVER_PANELS_MODE.RESIZABLE, topPanel, mainPanel });
    expect(component.find(DiscoverPanelsFixed).exists()).toBe(false);
    expect(component.find(DiscoverPanelsResizable).exists()).toBe(true);
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should pass true for hideTopPanel when mode is DISCOVER_PANELS_MODE.SINGLE', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: DISCOVER_PANELS_MODE.SINGLE, topPanel, mainPanel });
    expect(component.find(DiscoverPanelsFixed).prop('hideTopPanel')).toBe(true);
    expect(component.contains(topPanel)).toBe(false);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should pass false for hideTopPanel when mode is DISCOVER_PANELS_MODE.FIXED', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: DISCOVER_PANELS_MODE.FIXED, topPanel, mainPanel });
    expect(component.find(DiscoverPanelsFixed).prop('hideTopPanel')).toBe(false);
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });
});
