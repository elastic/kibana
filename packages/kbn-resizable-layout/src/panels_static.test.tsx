/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { mount } from 'enzyme';
import type { ReactElement } from 'react';
import React from 'react';
import { ResizableLayoutDirection } from '../types';
import { PanelsStatic } from './panels_static';

describe('Panels static', () => {
  const mountComponent = ({
    direction = ResizableLayoutDirection.Vertical,
    hideFixedPanel = false,
    fixedPanel = <></>,
    flexPanel = <></>,
  }: {
    direction?: ResizableLayoutDirection;
    hideFixedPanel?: boolean;
    fixedPanel: ReactElement;
    flexPanel: ReactElement;
  }) => {
    return mount(
      <PanelsStatic
        direction={direction}
        hideFixedPanel={hideFixedPanel}
        fixedPanel={fixedPanel}
        flexPanel={flexPanel}
      />
    );
  };

  it('should render both panels when hideFixedPanel is false', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({ fixedPanel, flexPanel });
    expect(component.contains(fixedPanel)).toBe(true);
    expect(component.contains(flexPanel)).toBe(true);
  });

  it('should render only flex panel when hideFixedPanel is true', () => {
    const fixedPanel = <div data-test-subj="fixedPanel" />;
    const flexPanel = <div data-test-subj="flexPanel" />;
    const component = mountComponent({ hideFixedPanel: true, fixedPanel, flexPanel });
    expect(component.contains(fixedPanel)).toBe(false);
    expect(component.contains(flexPanel)).toBe(true);
  });

  it('should pass direction "column" to EuiFlexGroup when direction is ResizableLayoutDirection.Vertical', () => {
    const component = mountComponent({
      direction: ResizableLayoutDirection.Vertical,
      fixedPanel: <></>,
      flexPanel: <></>,
    });
    expect(component.find(EuiFlexGroup).prop('direction')).toBe('column');
  });

  it('should pass direction "row" to EuiFlexGroup when direction is ResizableLayoutDirection.Horizontal', () => {
    const component = mountComponent({
      direction: ResizableLayoutDirection.Horizontal,
      fixedPanel: <></>,
      flexPanel: <></>,
    });
    expect(component.find(EuiFlexGroup).prop('direction')).toBe('row');
  });
});
