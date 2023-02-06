/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount } from 'enzyme';
import type { ReactElement, RefObject } from 'react';
import React from 'react';
import { Panels, PANELS_MODE } from './panels';
import { PanelsResizable } from './panels_resizable';
import { PanelsFixed } from './panels_fixed';

describe('Panels component', () => {
  const mountComponent = ({
    mode = PANELS_MODE.RESIZABLE,
    resizeRef = { current: null },
    initialTopPanelHeight = 200,
    minTopPanelHeight = 100,
    minMainPanelHeight = 100,
    topPanel = <></>,
    mainPanel = <></>,
  }: {
    mode?: PANELS_MODE;
    resizeRef?: RefObject<HTMLDivElement>;
    initialTopPanelHeight?: number;
    minTopPanelHeight?: number;
    minMainPanelHeight?: number;
    mainPanel?: ReactElement;
    topPanel?: ReactElement;
  }) => {
    return mount(
      <Panels
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

  it('should show PanelsFixed when mode is PANELS_MODE.SINGLE', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: PANELS_MODE.SINGLE, topPanel, mainPanel });
    expect(component.find(PanelsFixed).exists()).toBe(true);
    expect(component.find(PanelsResizable).exists()).toBe(false);
    expect(component.contains(topPanel)).toBe(false);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should show PanelsFixed when mode is PANELS_MODE.FIXED', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: PANELS_MODE.FIXED, topPanel, mainPanel });
    expect(component.find(PanelsFixed).exists()).toBe(true);
    expect(component.find(PanelsResizable).exists()).toBe(false);
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should show PanelsResizable when mode is PANELS_MODE.RESIZABLE', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: PANELS_MODE.RESIZABLE, topPanel, mainPanel });
    expect(component.find(PanelsFixed).exists()).toBe(false);
    expect(component.find(PanelsResizable).exists()).toBe(true);
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should pass true for hideTopPanel when mode is PANELS_MODE.SINGLE', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: PANELS_MODE.SINGLE, topPanel, mainPanel });
    expect(component.find(PanelsFixed).prop('hideTopPanel')).toBe(true);
    expect(component.contains(topPanel)).toBe(false);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should pass false for hideTopPanel when mode is PANELS_MODE.FIXED', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ mode: PANELS_MODE.FIXED, topPanel, mainPanel });
    expect(component.find(PanelsFixed).prop('hideTopPanel')).toBe(false);
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });
});
