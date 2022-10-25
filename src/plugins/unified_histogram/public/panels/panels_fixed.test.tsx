/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount } from 'enzyme';
import type { ReactElement } from 'react';
import React from 'react';
import { PanelsFixed } from './panels_fixed';

describe('Panels fixed', () => {
  const mountComponent = ({
    hideTopPanel = false,
    topPanel = <></>,
    mainPanel = <></>,
  }: {
    hideTopPanel?: boolean;
    topPanel: ReactElement;
    mainPanel: ReactElement;
  }) => {
    return mount(
      <PanelsFixed hideTopPanel={hideTopPanel} topPanel={topPanel} mainPanel={mainPanel} />
    );
  };

  it('should render both panels when hideTopPanel is false', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ topPanel, mainPanel });
    expect(component.contains(topPanel)).toBe(true);
    expect(component.contains(mainPanel)).toBe(true);
  });

  it('should render only main panel when hideTopPanel is true', () => {
    const topPanel = <div data-test-subj="topPanel" />;
    const mainPanel = <div data-test-subj="mainPanel" />;
    const component = mountComponent({ hideTopPanel: true, topPanel, mainPanel });
    expect(component.contains(topPanel)).toBe(false);
    expect(component.contains(mainPanel)).toBe(true);
  });
});
