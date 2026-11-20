/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getFlyoutManagerStore } from '@elastic/eui';
import type * as FlyoutManagerModule from '@elastic/eui/src/components/flyout/manager';
import { useDocViewerFlyoutSession } from './use_doc_viewer_flyout_session';

// The `@elastic/eui` test build stubs `EuiFlyout`; the flyout manager components are real.
const { EuiFlyoutMain, EuiFlyoutManager } = jest.requireActual<typeof FlyoutManagerModule>(
  '@elastic/eui/lib/components/flyout/manager'
);

const DOC_VIEWER_ID = 'docViewerFlyout';
const HISTORY_KEY = Symbol('docViewerHistory');

interface DocViewerProps {
  hitId?: string;
  title?: string;
  onClose: () => void;
}

const DocViewer = ({ hitId, title = 'Document', onClose }: DocViewerProps) => {
  useDocViewerFlyoutSession({ flyoutId: DOC_VIEWER_ID, historyKey: HISTORY_KEY, hitId, onClose });

  return (
    <EuiFlyoutMain
      id={DOC_VIEWER_ID}
      historyKey={HISTORY_KEY}
      flyoutMenuProps={{ title }}
      onClose={onClose}
    >
      {title}
    </EuiFlyoutMain>
  );
};

interface ToolProps {
  historyKey?: symbol;
  onClose: () => void;
}

const Tool = ({ historyKey = HISTORY_KEY, onClose }: ToolProps) => (
  <EuiFlyoutMain
    id="toolFlyout"
    historyKey={historyKey}
    flyoutMenuProps={{ title: 'Tool' }}
    onClose={onClose}
    data-test-subj="toolFlyout"
  >
    tool
  </EuiFlyoutMain>
);

interface HarnessProps {
  showDocViewer?: boolean;
  showTool?: boolean;
  docViewer: DocViewerProps;
  tool: ToolProps;
}

// Mirrors Security's tool flyouts, which outlive the doc viewer: closing either is up to the test.
const Harness = ({ showDocViewer = true, showTool = true, docViewer, tool }: HarnessProps) => (
  <EuiFlyoutManager>
    {showDocViewer && <DocViewer {...docViewer} />}
    {showTool && <Tool {...tool} />}
  </EuiFlyoutManager>
);

const getSessionMainIds = () =>
  getFlyoutManagerStore()
    .getState()
    .sessions.map(({ mainFlyoutId }) => mainFlyoutId);

const flushTimers = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe('useDocViewerFlyoutSession', () => {
  it('closes the flyouts stacked on the doc viewer when it unmounts', async () => {
    const onToolClose = jest.fn();
    const props = { docViewer: { hitId: 'a', onClose: jest.fn() }, tool: { onClose: onToolClose } };
    const { rerender, unmount } = render(<Harness {...props} />);
    expect(getSessionMainIds()).toEqual([DOC_VIEWER_ID, 'toolFlyout']);

    rerender(<Harness {...props} showDocViewer={false} />);
    await flushTimers();

    expect(getSessionMainIds()).toEqual([]);
    expect(onToolClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('closes the flyouts stacked on the doc viewer when it switches documents', async () => {
    const onToolClose = jest.fn();
    const onDocViewerClose = jest.fn();
    const props = {
      docViewer: { hitId: 'a', onClose: onDocViewerClose },
      tool: { onClose: onToolClose },
    };
    const { rerender, unmount } = render(<Harness {...props} />);

    rerender(<Harness {...props} docViewer={{ hitId: 'b', onClose: onDocViewerClose }} />);
    await flushTimers();

    expect(getSessionMainIds()).toEqual([DOC_VIEWER_ID]);
    expect(onToolClose).toHaveBeenCalledTimes(1);
    expect(onDocViewerClose).not.toHaveBeenCalled();
    unmount();
  });

  it('keeps the stacked flyouts when the displayed document resolves', async () => {
    const onToolClose = jest.fn();
    const onDocViewerClose = jest.fn();
    const props = { docViewer: { onClose: onDocViewerClose }, tool: { onClose: onToolClose } };
    const { rerender, unmount } = render(<Harness {...props} />);

    rerender(<Harness {...props} docViewer={{ hitId: 'a', onClose: onDocViewerClose }} />);
    await flushTimers();

    expect(getSessionMainIds()).toEqual([DOC_VIEWER_ID, 'toolFlyout']);
    expect(onToolClose).not.toHaveBeenCalled();
    unmount();
  });

  it('leaves flyouts of other history groups open', async () => {
    const onToolClose = jest.fn();
    const props = {
      docViewer: { hitId: 'a', onClose: jest.fn() },
      tool: { historyKey: Symbol('other'), onClose: onToolClose },
    };
    const { rerender, unmount } = render(<Harness {...props} />);

    rerender(<Harness {...props} showDocViewer={false} />);
    await flushTimers();

    expect(getSessionMainIds()).toEqual(['toolFlyout']);
    expect(onToolClose).not.toHaveBeenCalled();
    unmount();
  });

  it('does not close the doc viewer when it re-registers with a new title', async () => {
    const onDocViewerClose = jest.fn();
    const props = {
      showTool: false,
      docViewer: { hitId: 'a', onClose: onDocViewerClose },
      tool: { onClose: jest.fn() },
    };
    const { rerender, unmount } = render(<Harness {...props} />);

    rerender(<Harness {...props} docViewer={{ ...props.docViewer, title: 'Alert' }} />);
    await flushTimers();

    expect(getSessionMainIds()).toEqual([DOC_VIEWER_ID]);
    expect(onDocViewerClose).not.toHaveBeenCalled();
    unmount();
  });

  it('reports the doc viewer closed when closing a stacked flyout closes it after a re-registration', async () => {
    const onDocViewerClose = jest.fn();
    const props = {
      showTool: false,
      docViewer: { hitId: 'a', onClose: onDocViewerClose },
      tool: { onClose: jest.fn() },
    };
    const { rerender, unmount } = render(<Harness {...props} />);
    const docViewer = { ...props.docViewer, title: 'Alert' };
    rerender(<Harness {...props} docViewer={docViewer} />);
    rerender(<Harness {...props} docViewer={docViewer} showTool />);

    fireEvent.click(
      screen.getByTestId('toolFlyout').querySelector('[data-test-subj="euiFlyoutCloseButton"]')!
    );
    await flushTimers();

    expect(getSessionMainIds()).toEqual([]);
    expect(onDocViewerClose).toHaveBeenCalledTimes(1);
    unmount();
  });
});
