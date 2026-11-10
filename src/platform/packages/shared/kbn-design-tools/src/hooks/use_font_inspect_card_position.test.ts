/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { useFontInspectCardPosition } from './use_font_inspect_card_position';
import * as clampModule from '../lib/dom/clamp_to_viewport';

describe('useFontInspectCardPosition', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('centers the card on the anchor and clamps to the viewport', () => {
    const cardRef: MutableRefObject<HTMLDivElement | null> = { current: null };
    const card = document.createElement('div');
    cardRef.current = card;
    document.body.appendChild(card);

    card.getBoundingClientRect = () => ({
      width: 80,
      height: 120,
      top: 0,
      left: 0,
      right: 80,
      bottom: 120,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const anchorRect = {
      top: 10,
      left: 20,
      width: 100,
      height: 40,
      right: 120,
      bottom: 50,
      x: 20,
      y: 10,
      toJSON: () => {},
    } as DOMRect;

    jest.spyOn(clampModule, 'clampToViewport').mockReturnValue({ left: 30, top: 54 });

    renderHook(() => useFontInspectCardPosition(cardRef, anchorRect));

    expect(clampModule.clampToViewport).toHaveBeenCalledWith(30, 54, 80, 120);
    expect(card.style.left).toBe('30px');
    expect(card.style.top).toBe('54px');

    card.remove();
  });

  it('does nothing when anchorRect is null', () => {
    const cardRef: MutableRefObject<HTMLDivElement | null> = { current: null };
    const card = document.createElement('div');
    cardRef.current = card;

    const clampSpy = jest.spyOn(clampModule, 'clampToViewport');

    renderHook(() => useFontInspectCardPosition(cardRef, null));

    expect(clampSpy).not.toHaveBeenCalled();
    expect(card.style.left).toBe('');
  });
});
