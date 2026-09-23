/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { createPortal } from 'react-dom';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiFlyout, EuiProvider } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import { I18nProvider } from '@kbn/i18n-react';
import { initializeEditorMenuManager, type EditorMenuServices } from '@kbn/presentation-util';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { core as embeddableCore } from '@kbn/embeddable-plugin/public/kibana_services';
import hjson from 'hjson';
import { VegaSpecEditor } from '../components/vega_vis_editor';
import { getNotifications } from '../services';
import { VEGA_EDITOR_HELP_ACTION, VEGA_EDITOR_OPTIONS_ACTION } from '../constants';
import { getVegaEditorHelpLabel, getVegaEditorOptionsLabel } from './editor_menu_actions';
import { VegaEditorFlyout } from './vega_editor_flyout';

// Exercise real flyout and focus behavior instead of EUI's simplified Jest components.
jest.mock('@elastic/eui', () =>
  jest.requireActual(require.resolve('@elastic/eui/package.json').replace('package.json', 'lib'))
);
jest.mock('@kbn/monaco', () => ({ XJsonLang: { ID: 'json' } }));
jest.mock('@kbn/embeddable-plugin/public/kibana_services', () => ({
  core: {
    notifications: { toasts: { addError: jest.fn() } },
    overlays: { openSystemFlyout: jest.fn() },
  },
}));
jest.mock('../services', () => ({
  getNotifications: jest.fn(() => ({ toasts: { addError: jest.fn() } })),
  getDocLinks: () => ({ links: { visualize: { vega: 'https://elastic.co/vega-help' } } }),
}));
jest.mock('@kbn/code-editor', () => ({
  HJSON_LANG_ID: 'hjson',
  CodeEditor: ({
    value,
    onChange,
    languageId,
  }: {
    value: string;
    onChange: (value: string) => void;
    languageId: string;
  }) => (
    <textarea
      aria-label="Vega spec"
      data-language={languageId}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const dateRange = { from: 'now-15m', to: 'now' };

const FlyoutSearchBar: UnifiedSearchPublicPluginStart['ui']['SearchBar'] = ({
  query,
  filters,
  showSubmitButton,
  onQueryChange,
  onQuerySubmit,
  onFiltersUpdated,
}) => (
  <div data-test-subj="editorFlyoutSearchBar">
    <span>{typeof query?.query === 'string' ? query.query : ''}</span>
    <span data-test-subj="filterCount">{filters?.length ?? 0}</span>
    {showSubmitButton ? <span data-test-subj="querySubmitButton">Update</span> : null}
    <button
      type="button"
      onClick={() =>
        onQueryChange?.({ dateRange, query: { language: 'kuery', query: 'status:200' } })
      }
    >
      Type query
    </button>
    <button
      type="button"
      data-test-subj="editorFlyoutSearchBarQuery"
      onClick={() =>
        onQuerySubmit?.({ dateRange, query: { language: 'kuery', query: 'status:ok' } })
      }
    >
      Query
    </button>
    <button
      type="button"
      data-test-subj="editorFlyoutSearchBarClearQuery"
      onClick={() => onQuerySubmit?.({ dateRange, query: { language: 'kuery', query: '' } })}
    >
      Clear query
    </button>
    <button
      type="button"
      onClick={() =>
        onQuerySubmit?.({ dateRange, query: { language: 'kuery', query: 'status:200' } })
      }
    >
      Update query
    </button>
    <button
      type="button"
      data-test-subj="editorFlyoutSearchBarFilters"
      onClick={() => onFiltersUpdated?.([{ meta: { key: 'status' } }])}
    >
      Filters
    </button>
    <button
      type="button"
      onClick={() => onFiltersUpdated?.([{ meta: { alias: 'agent' } } as Filter])}
    >
      Set filters
    </button>
    <button
      type="button"
      data-test-subj="editorFlyoutSearchBarClearFilters"
      onClick={() => onFiltersUpdated?.([])}
    >
      Clear filters
    </button>
  </div>
);

const editorMenuServices: EditorMenuServices = {
  notifications: { toasts: { addError: jest.fn() } },
  getAction: async (id: string) => {
    const actions = jest.requireActual(
      './editor_menu_actions'
    ) as typeof import('./editor_menu_actions');
    const action =
      id === VEGA_EDITOR_OPTIONS_ACTION
        ? actions.getVegaEditorOptionsAction()
        : id === VEGA_EDITOR_HELP_ACTION
        ? actions.getVegaEditorHelpAction()
        : undefined;
    if (!action) throw new Error(`Unexpected action ${id}`);
    return {
      execute: (context) => action.execute(context as Parameters<typeof action.execute>[0]),
    };
  },
};

describe('VegaEditorFlyout', () => {
  type SystemFlyoutOptions = NonNullable<
    Parameters<typeof embeddableCore.overlays.openSystemFlyout>[1]
  >;

  interface MockSystemFlyout {
    close: () => Promise<void>;
    content: React.ReactElement;
    onClose: Promise<void>;
    options: SystemFlyoutOptions;
  }

  let setSystemFlyout: React.Dispatch<React.SetStateAction<MockSystemFlyout | null>> = () => {};
  const SystemFlyoutHost = () => {
    const [systemFlyout, setFlyout] = React.useState<MockSystemFlyout | null>(null);
    setSystemFlyout = setFlyout;
    if (!systemFlyout) return null;
    const { close, content, onClose, options } = systemFlyout;
    const { onClose: onSystemFlyoutClose, ...flyoutProps } = options;
    return createPortal(
      <EuiFlyout
        {...flyoutProps}
        onClose={() => {
          onSystemFlyoutClose?.({ close, onClose });
          void close();
        }}
      >
        {content}
      </EuiFlyout>,
      document.body
    );
  };

  const mockOpenSystemFlyout = jest.mocked(embeddableCore.overlays.openSystemFlyout);

  beforeEach(() => {
    mockOpenSystemFlyout.mockImplementation((content, options) => {
      let resolveClose = () => {};
      let isClosed = false;
      const onClose = new Promise<void>((resolve) => {
        resolveClose = resolve;
      });
      const close = jest.fn(async () => {
        if (isClosed) return;
        isClosed = true;
        setSystemFlyout(null);
        resolveClose();
      });
      setSystemFlyout({ close, content, onClose, options: options ?? {} });
      return { close, onClose };
    });
  });

  const renderFlyout = async ({
    isNewPanel = false,
    type = 'push',
    searchable = true,
    initialQuery,
    initialFilters,
  }: {
    isNewPanel?: boolean;
    type?: 'push' | 'overlay';
    searchable?: boolean;
    initialQuery?: Query;
    initialFilters?: Filter[];
  } = {}) => {
    const closeFlyout = jest.fn();
    const onRevert = jest.fn();
    const onPreview = jest.fn();
    const onSave = jest.fn();
    const query$ = new BehaviorSubject<Query | undefined>(initialQuery);
    const filters$ = new BehaviorSubject<Filter[] | undefined>(initialFilters);
    const setQuery = jest.fn((query: Query | undefined): void => {
      query$.next(query);
    });
    const setFilters = jest.fn((filters: Filter[] | undefined): void => {
      filters$.next(filters);
    });
    const menuManager = initializeEditorMenuManager({
      services: editorMenuServices,
      api: searchable
        ? {
            filters$,
            query$,
            timeRange$: new BehaviorSubject(undefined),
            setFilters,
            setQuery,
            setTimeRange: (): void => undefined,
          }
        : { timeRange$: new BehaviorSubject(undefined) },
      editorType: 'vega',
      title: 'Vega',
      supportedMenus: ['options', 'help'],
      menuActionIds: {
        options: VEGA_EDITOR_OPTIONS_ACTION,
        help: VEGA_EDITOR_HELP_ACTION,
      },
      menuLabels: {
        options: getVegaEditorOptionsLabel(),
        help: getVegaEditorHelpLabel(),
      },
    });
    const { unmount } = render(
      <I18nProvider>
        <EuiProvider>
          <SystemFlyoutHost />
          <EuiFlyout
            id={menuManager.flyoutId}
            historyKey={menuManager.historyKey}
            outsideClickCloses
            session="start"
            type={type}
            ownFocus={type !== 'overlay'}
            aria-labelledby="vega-flyout-title"
            onClose={closeFlyout}
            flyoutMenuProps={menuManager.flyoutMenuProps}
          >
            <VegaEditorFlyout
              menuManager={menuManager}
              SearchBar={FlyoutSearchBar}
              ariaLabelledBy="vega-flyout-title"
              closeFlyout={closeFlyout}
              initialSpec={{ format: 'hjson', value: '{ mark: point }' }}
              isNewPanel={isNewPanel}
              onPreview={onPreview}
              onRevert={onRevert}
              onSave={onSave}
            />
          </EuiFlyout>
        </EuiProvider>
      </I18nProvider>
    );
    await screen.findByRole('textbox', { name: 'Vega spec' });
    return { closeFlyout, onRevert, onPreview, onSave, setFilters, setQuery, unmount };
  };

  it('places the search bar below the Vega title and above the spec editor', async () => {
    await renderFlyout();
    const title = screen.getByRole('heading', { name: 'Vega', level: 2 });
    const searchBar = screen.getByTestId('editorFlyoutSearchBar');
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });

    expect(title.compareDocumentPosition(searchBar)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(searchBar.compareDocumentPosition(editor)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('hides the search bar when the panel cannot write unified search', async () => {
    await renderFlyout({ searchable: false });

    expect(screen.getByRole('textbox', { name: 'Vega spec' })).toBeVisible();
    expect(screen.queryByTestId('editorFlyoutSearchBar')).not.toBeInTheDocument();
  });

  it('writes the query when it is submitted and writes filters immediately', async () => {
    const { setFilters, setQuery } = await renderFlyout();
    const user = userEvent.setup();

    expect(screen.getByTestId('querySubmitButton')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Type query' }));
    expect(setQuery).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Update query' }));
    expect(setQuery).toHaveBeenCalledWith({ language: 'kuery', query: 'status:200' });
    expect(screen.getByText('status:200')).toBeVisible();

    await user.click(screen.getByTestId('editorFlyoutSearchBarClearQuery'));
    expect(setQuery).toHaveBeenCalledWith(undefined);

    await user.click(screen.getByRole('button', { name: 'Set filters' }));
    expect(setFilters).toHaveBeenCalledWith([{ meta: { alias: 'agent' } }]);
    expect(screen.getByTestId('filterCount')).toHaveTextContent('1');

    await user.click(screen.getByTestId('editorFlyoutSearchBarClearFilters'));
    expect(setFilters).toHaveBeenCalledWith(undefined);
  });

  it('restores the query and filters from when the flyout opened', async () => {
    const initialFilters = [{ meta: { alias: 'original' } } as Filter];
    const { setFilters, setQuery, unmount } = await renderFlyout({
      initialQuery: { language: 'kuery', query: 'host:a' },
      initialFilters,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Update query' }));
    await user.click(screen.getByRole('button', { name: 'Set filters' }));
    setQuery.mockClear();
    setFilters.mockClear();

    unmount();

    expect(setQuery).toHaveBeenCalledWith({ language: 'kuery', query: 'host:a' });
    expect(setFilters).toHaveBeenCalledWith(initialFilters);
  });

  it('keeps live query and filter edits when the flyout is applied', async () => {
    const { setFilters, setQuery, unmount } = await renderFlyout();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Update query' }));
    await user.click(screen.getByTestId('vegaEditorFlyoutSaveButton'));
    setQuery.mockClear();
    setFilters.mockClear();

    unmount();

    expect(setQuery).not.toHaveBeenCalled();
    expect(setFilters).not.toHaveBeenCalled();
  });

  it('enables Preview and Apply and close when the search bar changes', async () => {
    const { onPreview } = await renderFlyout();
    const user = userEvent.setup();
    const previewButton = screen.getByTestId('vegaEditorFlyoutPreviewButton');
    const applyButton = screen.getByTestId('vegaEditorFlyoutSaveButton');

    expect(previewButton).toBeDisabled();
    expect(applyButton).toBeDisabled();

    await user.click(screen.getByTestId('editorFlyoutSearchBarQuery'));
    expect(previewButton).toBeEnabled();
    expect(applyButton).toBeEnabled();

    await user.click(screen.getByTestId('editorFlyoutSearchBarClearQuery'));
    expect(previewButton).toBeDisabled();
    expect(applyButton).toBeDisabled();

    await user.click(screen.getByTestId('editorFlyoutSearchBarFilters'));
    expect(previewButton).toBeEnabled();
    expect(applyButton).toBeEnabled();

    await user.click(previewButton);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(previewButton).toBeDisabled();
    expect(applyButton).toBeEnabled();

    await user.click(screen.getByTestId('editorFlyoutSearchBarClearFilters'));
    expect(previewButton).toBeEnabled();
    expect(applyButton).toBeDisabled();
  });

  it('does not preview while typing; Preview pushes the current spec', async () => {
    const { onPreview } = await renderFlyout();
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: 'Vega', level: 2 })).toBeInTheDocument();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    const previewButton = screen.getByTestId('vegaEditorFlyoutPreviewButton');

    // Preview is disabled until the spec differs from what is rendered on the panel.
    expect(previewButton).toBeDisabled();

    await user.clear(editor);
    await user.paste('{ mark: bar }');
    // Editing must not trigger the preview (no queries run on keystrokes).
    expect(onPreview).not.toHaveBeenCalled();
    expect(previewButton).toBeEnabled();

    await user.click(previewButton);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
    // After previewing, Preview is disabled again until further edits.
    expect(previewButton).toBeDisabled();
  });

  it('disables Apply and close until an existing panel has real changes', async () => {
    await renderFlyout();
    const user = userEvent.setup();

    // No edits yet → nothing to save.
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeDisabled();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeEnabled();

    // Editing back to the original spec disables Save again.
    await user.clear(editor);
    await user.paste('{ mark: point }');
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeDisabled();
  });

  it('enables Apply and close for a new panel so its default spec can be accepted', async () => {
    await renderFlyout({ isNewPanel: true });
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeEnabled();
  });

  it('saves the current spec, closes, and does not revert on unmount', async () => {
    const { closeFlyout, onPreview, onRevert, onSave, unmount } = await renderFlyout();
    const user = userEvent.setup();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');

    await user.click(screen.getByTestId('vegaEditorFlyoutSaveButton'));
    expect(onSave).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
    expect(closeFlyout).toHaveBeenCalledTimes(1);
    // Save persists directly; it does not depend on a prior Preview.
    expect(onPreview).not.toHaveBeenCalled();

    // Unmounting after a Save must not revert the committed spec.
    unmount();
    expect(onRevert).not.toHaveBeenCalled();
  });

  it('reverts to the pre-edit state on unmount when not applied (e.g. Esc / click-away)', async () => {
    const { onRevert, unmount } = await renderFlyout();
    const user = userEvent.setup();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');
    await user.click(screen.getByTestId('vegaEditorFlyoutPreviewButton')); // previewed but not saved

    unmount();
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it('closes the flyout when Cancel is clicked (revert happens on the ensuing unmount)', async () => {
    const { closeFlyout, onSave, onRevert } = await renderFlyout();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('vegaEditorFlyoutCancelButton'));
    expect(closeFlyout).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    // Cancel only closes; the revert is driven by unmount, not the button.
    expect(onRevert).not.toHaveBeenCalled();
  });

  it('places gear then help in the flyout menu and opens only one popover', async () => {
    await renderFlyout();
    const user = userEvent.setup();
    const options = screen.getByRole('button', { name: 'Vega editor options' });
    const help = screen.getByRole('button', { name: 'Vega help' });
    expect(screen.getAllByRole('button').indexOf(options)).toBeLessThan(
      screen.getAllByRole('button').indexOf(help)
    );
    expect(screen.queryByRole('button', { name: 'Edit filters' })).not.toBeInTheDocument();
    expect(within(screen.getByTestId('vega-editor')).queryByRole('button')).not.toBeInTheDocument();
    await user.click(options);
    expect(await screen.findByText('Reformat as HJSON')).toBeVisible();
    await user.click(help);
    expect(await screen.findByRole('menuitem', { name: /Kibana Vega help/ })).toHaveAttribute(
      'href',
      'https://elastic.co/vega-help'
    );
    expect(screen.getByRole('menuitem', { name: /Vega-Lite documentation/ })).toHaveAttribute(
      'href',
      'https://vega.github.io/vega-lite/docs/'
    );
    expect(screen.getByRole('menuitem', { name: /Vega documentation/ })).toHaveAttribute(
      'href',
      'https://vega.github.io/vega/docs/'
    );
    expect(screen.queryByText('Reformat as HJSON')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Vega spec' })).toBeVisible();
  });

  it('opens with the keyboard and restores focus after Escape', async () => {
    const { closeFlyout } = await renderFlyout();
    const user = userEvent.setup();
    const options = screen.getByRole('button', { name: 'Vega editor options' });
    act(() => options.focus());
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Reformat as HJSON')).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Vega editor options' })).toContainElement(
        document.activeElement as HTMLElement
      )
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(options).toHaveFocus());
    await waitFor(() => expect(screen.queryByText('Reformat as HJSON')).not.toBeInTheDocument());
    expect(closeFlyout).not.toHaveBeenCalled();
  });

  it.each([
    ['Reformat as HJSON', 'hjson'],
    ['Reformat as JSON, delete comments', 'json'],
  ])('formats the latest text with %s without previewing or saving', async (label, language) => {
    const { onPreview, onSave } = await renderFlyout();
    const user = userEvent.setup();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{\n// comment\n"mark": "bar"\n}');
    await user.click(screen.getByRole('button', { name: 'Vega editor options' }));
    await user.click(await screen.findByText(label));
    const value = (editor as HTMLTextAreaElement).value;
    expect(hjson.parse(value)).toEqual({ mark: 'bar' });
    expect(editor).toHaveAttribute('data-language', language);
    if (language === 'json') {
      expect(JSON.parse(value)).toEqual({ mark: 'bar' });
      expect(value).not.toContain('// comment');
    } else {
      expect(value).toContain('// comment');
    }
    expect(onPreview).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reports invalid specs without changing text or language', async () => {
    const addError = jest.fn();
    jest.mocked(getNotifications).mockReturnValue({
      ...getNotifications(),
      toasts: { ...getNotifications().toasts, addError },
    });
    const { onPreview, onSave } = await renderFlyout();
    const user = userEvent.setup();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ invalid');
    await user.click(screen.getByRole('button', { name: 'Vega editor options' }));
    await user.click(await screen.findByText('Reformat as JSON, delete comments'));
    expect(addError).toHaveBeenCalledWith(expect.any(Error), { title: 'Error formatting spec' });
    expect(editor).toHaveValue('{ invalid');
    expect(editor).toHaveAttribute('data-language', 'hjson');
    expect(onPreview).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps overlay controls in the legacy editor by default', () => {
    render(
      <I18nProvider>
        <VegaSpecEditor editorValue="{}" onChange={jest.fn()} />
      </I18nProvider>
    );
    const editor = within(screen.getByTestId('vega-editor'));
    expect(editor.getByRole('button', { name: 'Vega editor options' })).toBeVisible();
    expect(editor.getByRole('button', { name: 'Vega help' })).toBeVisible();
  });
});
