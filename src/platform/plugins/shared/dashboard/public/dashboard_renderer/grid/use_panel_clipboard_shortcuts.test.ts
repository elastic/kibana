/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { fireEvent, renderHook, waitFor } from '@testing-library/react';
import { usePanelClipboardShortcuts } from './use_panel_clipboard_shortcuts';

const mockToasts = {
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addDanger: jest.fn(),
  addError: jest.fn(),
};
jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    notifications: {
      get toasts() {
        return mockToasts;
      },
    },
  },
}));

const mockSanitizePanels = jest.fn();
jest.mock('../../panel_json/sanitize_panels', () => ({
  sanitizePanels: (...args: unknown[]) => mockSanitizePanels(...args),
}));

const mockSanitizeImportedPanels = jest.fn();
jest.mock('../../panel_json/import_panels', () => ({
  ...jest.requireActual('../../panel_json/import_panels'),
  sanitizeImportedPanels: (...args: unknown[]) => mockSanitizeImportedPanels(...args),
}));

jest.mock('./copied_panels_warning', () => ({
  getCopiedPanelsWarningText: (props: unknown) => props,
}));

let mockDashboardApi: {
  children$: BehaviorSubject<Record<string, unknown>>;
  selectedPanelIds$: BehaviorSubject<string[]>;
  hasOverlays$: BehaviorSubject<boolean>;
  addIncomingEmbeddables: jest.Mock;
};
jest.mock('../../dashboard_api/use_dashboard_api', () => ({
  useDashboardApi: () => mockDashboardApi,
}));

// Ctrl is the selection modifier on every platform except macOS
jest.mock('@kbn/shared-ux-utility', () => ({
  ...jest.requireActual('@kbn/shared-ux-utility'),
  isMac: false,
}));

const GRID = { x: 0, y: 0, w: 24, h: 15 };

const createExportablePanel = (uuid: string, config: object) => ({
  uuid,
  type: 'testPanel',
  supportsJsonExport: true,
  title$: new BehaviorSubject<string | undefined>(`Title of ${uuid}`),
  hideTitle$: new BehaviorSubject<boolean | undefined>(false),
  serializeState: jest.fn().mockReturnValue({ byReference: true }),
  applySerializedState: jest.fn(),
  anyStateChange$: new BehaviorSubject<void>(undefined),
  latestState$: new BehaviorSubject({}),
  getSerializedStateByValue: jest.fn().mockReturnValue(config),
  getSerializedStateByReference: jest.fn(),
  canLinkToLibrary: jest.fn(),
  canUnlinkFromLibrary: jest.fn(),
  saveToLibrary: jest.fn(),
  hasLibraryItemWithTitle: jest.fn(),
  parentApi: { getDashboardPanelFromId: () => ({ grid: GRID }) },
});

const pressCopy = (target: Element | Document = document.body) =>
  fireEvent.keyDown(target, { key: 'c', ctrlKey: true });

const paste = (text: string, target: Element = document.body) =>
  fireEvent.paste(target, { clipboardData: { getData: () => text } });

describe('usePanelClipboardShortcuts', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    mockDashboardApi = {
      children$: new BehaviorSubject<Record<string, unknown>>({
        panel1: createExportablePanel('panel1', { title: 'by value 1' }),
        panel2: createExportablePanel('panel2', { title: 'by value 2' }),
        markdown: {
          uuid: 'markdown',
          type: 'markdown',
          title$: new BehaviorSubject('Notes'),
          hideTitle$: new BehaviorSubject(false),
        },
      }),
      selectedPanelIds$: new BehaviorSubject<string[]>([]),
      hasOverlays$: new BehaviorSubject(false),
      addIncomingEmbeddables: jest.fn(),
    };
    mockSanitizePanels.mockImplementation(async (panels: unknown[]) => ({
      panels,
      warnings: [],
      relatedItems: [],
    }));
  });

  describe('copy', () => {
    it('writes the sanitized full configuration of the selected panels', async () => {
      mockDashboardApi.selectedPanelIds$.next(['panel1', 'panel2']);
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));

      const notPrevented = pressCopy();

      expect(notPrevented).toBe(false);
      await waitFor(() => expect(mockToasts.addSuccess).toHaveBeenCalled());
      expect(mockSanitizePanels).toHaveBeenCalledWith([
        { type: 'testPanel', grid: GRID, config: { title: 'by value 1' } },
        { type: 'testPanel', grid: GRID, config: { title: 'by value 2' } },
      ]);
      expect(JSON.parse(writeText.mock.calls[0][0])).toEqual([
        { type: 'testPanel', grid: GRID, config: { title: 'by value 1' } },
        { type: 'testPanel', grid: GRID, config: { title: 'by value 2' } },
      ]);
      expect(mockToasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: '2 panels copied' })
      );
    });

    it('copies the panels that can be exported and names the ones it skips', async () => {
      mockDashboardApi.selectedPanelIds$.next(['panel1', 'markdown']);
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));

      pressCopy();

      await waitFor(() => expect(mockToasts.addWarning).toHaveBeenCalled());
      expect(JSON.parse(writeText.mock.calls[0][0])).toEqual([
        { type: 'testPanel', grid: GRID, config: { title: 'by value 1' } },
      ]);
      expect(mockToasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Panel copied',
          text: { skippedPanelNames: ['Notes'], warningCount: 0 },
        })
      );
    });

    it('warns without writing when none of the selected panels can be copied', () => {
      mockDashboardApi.selectedPanelIds$.next(['markdown']);
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));

      pressCopy();

      expect(mockToasts.addWarning).toHaveBeenCalledWith({
        title: 'None of the selected panels can be copied.',
      });
      expect(mockSanitizePanels).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
    });

    it('does nothing without a selection', () => {
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));

      expect(pressCopy()).toBe(true);
      expect(mockSanitizePanels).not.toHaveBeenCalled();
    });

    it('leaves copying to text fields', () => {
      mockDashboardApi.selectedPanelIds$.next(['panel1']);
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));
      const input = document.createElement('input');
      document.body.appendChild(input);

      expect(pressCopy(input)).toBe(true);
      expect(mockSanitizePanels).not.toHaveBeenCalled();
      input.remove();
    });

    it('leaves copying to selected text', () => {
      mockDashboardApi.selectedPanelIds$.next(['panel1']);
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));
      jest
        .spyOn(window, 'getSelection')
        .mockReturnValue({ isCollapsed: false, toString: () => 'some text' } as Selection);

      expect(pressCopy()).toBe(true);
      expect(mockSanitizePanels).not.toHaveBeenCalled();
    });

    it('does nothing while an overlay is open or when disabled', () => {
      mockDashboardApi.selectedPanelIds$.next(['panel1']);
      mockDashboardApi.hasOverlays$.next(true);
      const { rerender } = renderHook(({ enabled }) => usePanelClipboardShortcuts({ enabled }), {
        initialProps: { enabled: true },
      });
      expect(pressCopy()).toBe(true);

      mockDashboardApi.hasOverlays$.next(false);
      rerender({ enabled: false });
      expect(pressCopy()).toBe(true);
      expect(mockSanitizePanels).not.toHaveBeenCalled();
    });
  });

  describe('paste', () => {
    const panelJson = JSON.stringify([{ type: 'testPanel', grid: GRID, config: { a: 1 } }]);

    it('adds the panels from panel JSON on the clipboard', async () => {
      mockSanitizeImportedPanels.mockResolvedValue({
        data: { panels: [{ type: 'testPanel', grid: GRID, config: { a: 1, title: 'Pasted' } }] },
        warnings: [],
        relatedItems: [],
      });
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));

      expect(paste(panelJson)).toBe(false);

      await waitFor(() => expect(mockDashboardApi.addIncomingEmbeddables).toHaveBeenCalled());
      expect(mockSanitizeImportedPanels).toHaveBeenCalledWith(JSON.parse(panelJson));
      expect(mockDashboardApi.addIncomingEmbeddables).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'testPanel',
          serializedState: { a: 1, title: 'Pasted' },
          size: { width: GRID.w, height: GRID.h },
        }),
      ]);
      expect(mockToasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Pasted was added' })
      );
    });

    it('ignores text that is not panel JSON', () => {
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));

      expect(paste('just some text')).toBe(true);
      expect(paste(JSON.stringify({ foo: 'bar' }))).toBe(true);
      expect(mockSanitizeImportedPanels).not.toHaveBeenCalled();
    });

    it('leaves pasting to text fields', () => {
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      expect(paste(panelJson, textarea)).toBe(true);
      expect(mockSanitizeImportedPanels).not.toHaveBeenCalled();
      textarea.remove();
    });

    it('shows an error when the panels cannot be added', async () => {
      mockSanitizeImportedPanels.mockRejectedValue(new Error('Server error'));
      renderHook(() => usePanelClipboardShortcuts({ enabled: true }));

      paste(panelJson);

      await waitFor(() => expect(mockToasts.addError).toHaveBeenCalled());
      expect(mockDashboardApi.addIncomingEmbeddables).not.toHaveBeenCalled();
    });
  });
});
