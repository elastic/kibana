/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { PinnedFontCard } from './pinned_font_card';
import type { OverlayZIndex } from '../../hooks/use_overlay_z_index';
import * as buildHighlightCssModule from '../../lib/dom/build_highlight_css';

const zIndex: OverlayZIndex = {
  clone: 1,
  overlay: 2,
  highlight: 3,
  label: 4,
  flyout: 5,
  popover: 6,
  modal: 7,
};

describe('PinnedFontCard', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.getBoundingClientRect = () => ({
      top: 10,
      left: 20,
      width: 100,
      height: 40,
      right: 120,
      bottom: 50,
      x: 20,
      y: 10,
      toJSON: () => {},
    });
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('renders the font info card with a close button', () => {
    renderWithI18n(<PinnedFontCard element={element} zIndex={zIndex} onClose={jest.fn()} />);

    expect(screen.getByTestId('fontInfoCard')).toBeInTheDocument();
    expect(screen.getByTestId('fontInfoCardClose')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    renderWithI18n(<PinnedFontCard element={element} zIndex={zIndex} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('fontInfoCardClose'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a highlight positioned according to the element bounding rect', () => {
    const buildHighlightCssSpy = jest.spyOn(buildHighlightCssModule, 'buildHighlightCss');

    renderWithI18n(<PinnedFontCard element={element} zIndex={zIndex} onClose={jest.fn()} />);

    expect(screen.getByTestId('fontInspectPinnedHighlight')).toBeInTheDocument();
    expect(buildHighlightCssSpy).toHaveBeenCalledWith(
      expect.objectContaining({ top: 10, left: 20, width: 100, height: 40 }),
      expect.any(String),
      zIndex.highlight
    );

    buildHighlightCssSpy.mockRestore();
  });
});
