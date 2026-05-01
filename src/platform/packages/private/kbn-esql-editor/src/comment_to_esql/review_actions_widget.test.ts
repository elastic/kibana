/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { monaco } from '@kbn/code-editor';
import { ReviewActionsWidget } from './review_actions_widget';

const fakeEuiTheme = {
  size: { xxs: '2px', s: '8px', m: '12px' },
  border: { radius: { small: '4px' } },
  font: { weight: { medium: 500 } },
  colors: {
    backgroundFilledSuccess: '#0a0',
    backgroundFilledText: '#222',
    textSuccess: '#0c0',
    textInverse: '#fff',
  },
} as unknown as EuiThemeComputed;

const buildEditor = () =>
  ({
    changeViewZones: jest.fn((cb: (accessor: monaco.editor.IViewZoneChangeAccessor) => void) => {
      cb({
        addZone: jest.fn(() => 'zone-id'),
        removeZone: jest.fn(),
        layoutZone: jest.fn(),
      });
    }),
    addContentWidget: jest.fn(),
    removeContentWidget: jest.fn(),
  } as unknown as monaco.editor.ICodeEditor);

describe('ReviewActionsWidget', () => {
  it('invokes the matching callback when each button is clicked', () => {
    const onAccept = jest.fn();
    const onReject = jest.fn();

    const widget = new ReviewActionsWidget(fakeEuiTheme, buildEditor(), 1, { onAccept, onReject });
    const dom = widget.getDomNode();
    const [rejectBtn, acceptBtn] = Array.from(dom.querySelectorAll('button'));

    rejectBtn.click();
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();

    acceptBtn.click();
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('labels the accept button "Replace" when isReplaceMode is true and "Keep" otherwise', () => {
    const callbacks = { onAccept: jest.fn(), onReject: jest.fn() };

    const keepWidget = new ReviewActionsWidget(fakeEuiTheme, buildEditor(), 1, callbacks, false);
    const keepButtons = Array.from(keepWidget.getDomNode().querySelectorAll('button'));
    expect(keepButtons[1].textContent).toMatch(/^Keep/);

    const replaceWidget = new ReviewActionsWidget(fakeEuiTheme, buildEditor(), 1, callbacks, true);
    const replaceButtons = Array.from(replaceWidget.getDomNode().querySelectorAll('button'));
    expect(replaceButtons[1].textContent).toMatch(/^Replace/);
  });
});
