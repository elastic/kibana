/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { monaco } from '@kbn/monaco';
import { useFindWidgetTooltipPosition } from './use_find_widget_tooltip_position';

const HOVER_POSITION_ABOVE = 3;
const HOVER_POSITION_BELOW = 2;

interface FakeHoverService {
  _createHover?: (options: Record<string, unknown>, skipLastFocusedUpdate?: boolean) => object;
}

const createEditor = (hoverService?: FakeHoverService) =>
  ({
    getContribution: jest
      .fn()
      .mockReturnValue(hoverService ? { _hoverService: hoverService } : null),
  } as unknown as monaco.editor.IStandaloneCodeEditor);

const createFindWidgetButton = (doc: Document = document) => {
  const widget = doc.createElement('div');
  widget.className = 'monaco-editor find-widget';
  const button = doc.createElement('div');
  widget.appendChild(button);
  doc.body.appendChild(widget);
  return button;
};

describe('useFindWidgetTooltipPosition', () => {
  const hover = {};
  let originalCreateHover: jest.Mock;
  let hoverService: FakeHoverService & {
    _createHover: NonNullable<FakeHoverService['_createHover']>;
  };

  const wrap = (service: FakeHoverService = hoverService) => {
    const { result } = renderHook(() => useFindWidgetTooltipPosition());
    result.current(createEditor(service));
  };

  afterEach(() => {
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    originalCreateHover = jest.fn().mockReturnValue(hover);
    hoverService = { _createHover: originalCreateHover };
  });

  it('asks for a position below the control for hovers inside the find widget', () => {
    wrap();
    const target = createFindWidgetButton();

    const result = hoverService._createHover({ target, content: 'Close (Escape)' });

    expect(result).toBe(hover);
    expect(originalCreateHover).toHaveBeenCalledWith(
      expect.objectContaining({ position: { hoverPosition: HOVER_POSITION_BELOW } }),
      undefined
    );
  });

  it('handles hover targets given as a list of elements', () => {
    wrap();
    const targetElements = [createFindWidgetButton()];

    hoverService._createHover({ target: { targetElements }, content: 'Find' });

    expect(originalCreateHover).toHaveBeenCalledWith(
      expect.objectContaining({ position: { hoverPosition: HOVER_POSITION_BELOW } }),
      undefined
    );
  });

  it('handles targets that belong to another document', () => {
    wrap();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const target = createFindWidgetButton(iframe.contentDocument ?? document);

    // An element of another document is not an `HTMLElement` of this window
    expect(target instanceof HTMLElement).toBe(false);
    expect(() => hoverService._createHover({ target, content: 'Close (Escape)' })).not.toThrow();
    expect(originalCreateHover).toHaveBeenCalledWith(
      expect.objectContaining({ position: { hoverPosition: HOVER_POSITION_BELOW } }),
      undefined
    );

    iframe.remove();
  });

  it('keeps other position options', () => {
    wrap();
    const target = createFindWidgetButton();

    hoverService._createHover({ target, content: 'Find', position: { foo: 'bar' } });

    expect(originalCreateHover).toHaveBeenCalledWith(
      expect.objectContaining({ position: { foo: 'bar', hoverPosition: HOVER_POSITION_BELOW } }),
      undefined
    );
  });

  it('does not change hovers outside of the find widget', () => {
    wrap();
    const target = document.createElement('div');

    hoverService._createHover({ target, content: 'Something else' });

    expect(originalCreateHover).toHaveBeenCalledWith(
      { target, content: 'Something else' },
      undefined
    );
  });

  it('does not override a position that was explicitly requested', () => {
    wrap();
    const target = createFindWidgetButton();
    const position = { hoverPosition: HOVER_POSITION_ABOVE };

    hoverService._createHover({ target, content: 'Find', position });

    expect(originalCreateHover).toHaveBeenCalledWith(
      expect.objectContaining({ position }),
      undefined
    );
  });

  it('passes the remaining arguments and the hover service on to the original method', () => {
    const service: FakeHoverService = {
      _createHover(this: FakeHoverService, _options, skipLastFocusedUpdate) {
        return { self: this, skipLastFocusedUpdate };
      },
    };
    wrap(service);

    const result = service._createHover?.({ target: document.createElement('div') }, true);

    expect(result).toEqual({ self: service, skipLastFocusedUpdate: true });
  });

  it('only wraps a given hover service once', () => {
    wrap();
    const wrapped = hoverService._createHover;

    wrap();

    expect(hoverService._createHover).toBe(wrapped);
  });

  it('does nothing when the find controller internals are not available', () => {
    const { result } = renderHook(() => useFindWidgetTooltipPosition());

    expect(() => result.current(createEditor())).not.toThrow();
    expect(() => result.current(createEditor({}))).not.toThrow();
  });

  describe('with the real Monaco editor', () => {
    // Guards the Monaco internals this relies on, which can change in any Monaco upgrade
    interface RealHoverService {
      showInstantHover: (options: {
        content: string;
        target: HTMLElement;
      }) => { anchor: number } | undefined;
    }

    // `AnchorPosition.BELOW` in Monaco's context view
    const ANCHOR_BELOW = 0;
    const ANCHOR_ABOVE = 1;

    let container: HTMLElement;
    let editor: monaco.editor.IStandaloneCodeEditor;

    beforeEach(() => {
      container = document.body.appendChild(document.createElement('div'));
      editor = monaco.editor.create(container, { value: '', language: 'plaintext' });
    });

    afterEach(() => {
      editor.dispose();
      container.remove();
    });

    it('opens hovers inside the find widget below and leaves other hovers above', () => {
      const { result } = renderHook(() => useFindWidgetTooltipPosition());
      result.current(editor);
      const realHoverService = editor.getContribution('editor.contrib.findController')
        ?._hoverService as unknown as RealHoverService;
      const findWidgetButton = createFindWidgetButton();
      const otherElement = document.body.appendChild(document.createElement('div'));

      expect(
        realHoverService.showInstantHover({ content: 'Next Match', target: findWidgetButton })
          ?.anchor
      ).toBe(ANCHOR_BELOW);
      expect(
        realHoverService.showInstantHover({ content: 'Other', target: otherElement })?.anchor
      ).toBe(ANCHOR_ABOVE);
    });
  });
});
