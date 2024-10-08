/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mount } from 'enzyme';
import type { ReactElement } from 'react';
import React from 'react';
import ResizableLayout from './resizable_layout';
import { PanelsResizable } from './panels_resizable';
import { PanelsStatic } from './panels_static';
import { ResizableLayoutDirection, ResizableLayoutMode } from '../types';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: jest.fn(() => ({ width: 1000, height: 1000 })),
}));

describe('ResizableLayout component', () => {
  const mountComponent = ({
    mode = ResizableLayoutMode.Resizable,
    container = null,
    initialFixedPanelSize = 200,
    minFixedPanelSize = 100,
    minFlexPanelSize = 100,
    fixedPanel = <></>,
    flexPanel = <></>,
  }: {
    mode?: ResizableLayoutMode;
    container?: HTMLElement | null;
    initialFixedPanelSize?: number;
    minFixedPanelSize?: number;
    minFlexPanelSize?: number;
    flexPanel?: ReactElement;
    fixedPanel?: ReactElement;
  }) => {
    return mount(
      <ResizableLayout
        mode={mode}
        direction={ResizableLayoutDirection.Vertical}
        container={container}
        fixedPanelSize={initialFixedPanelSize}
        minFixedPanelSize={minFixedPanelSize}
        minFlexPanelSize={minFlexPanelSize}
        fixedPanel={fixedPanel}
        flexPanel={flexPanel}
        onFixedPanelSizeChange={jest.fn()}
      />
    );
  };

  it('should show PanelsFixed when mode is ResizableLayoutMode.Single', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({ mode: ResizableLayoutMode.Single, fixedPanel, flexPanel });
    expect(component.find(PanelsStatic).exists()).toBe(true);
    expect(component.find(PanelsResizable).exists()).toBe(false);
    expect(component.contains(fixedPanel)).toBe(false);
    expect(component.contains(flexPanel)).toBe(true);
  });

  it('should show PanelsFixed when mode is ResizableLayoutMode.Static', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({ mode: ResizableLayoutMode.Static, fixedPanel, flexPanel });
    expect(component.find(PanelsStatic).exists()).toBe(true);
    expect(component.find(PanelsResizable).exists()).toBe(false);
    expect(component.contains(fixedPanel)).toBe(true);
    expect(component.contains(flexPanel)).toBe(true);
  });

  it('should show PanelsResizable when mode is ResizableLayoutMode.Resizable', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({
      mode: ResizableLayoutMode.Resizable,
      fixedPanel,
      flexPanel,
    });
    expect(component.find(PanelsStatic).exists()).toBe(false);
    expect(component.find(PanelsResizable).exists()).toBe(true);
    expect(component.contains(fixedPanel)).toBe(true);
    expect(component.contains(flexPanel)).toBe(true);
  });

  it('should pass true for hideFixedPanel when mode is ResizableLayoutMode.Single', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({ mode: ResizableLayoutMode.Single, fixedPanel, flexPanel });
    expect(component.find(PanelsStatic).prop('hideFixedPanel')).toBe(true);
    expect(component.contains(fixedPanel)).toBe(false);
    expect(component.contains(flexPanel)).toBe(true);
  });

  it('should pass false for hideFixedPanel when mode is ResizableLayoutMode.Static', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({ mode: ResizableLayoutMode.Static, fixedPanel, flexPanel });
    expect(component.find(PanelsStatic).prop('hideFixedPanel')).toBe(false);
    expect(component.contains(fixedPanel)).toBe(true);
    expect(component.contains(flexPanel)).toBe(true);
  });
});
