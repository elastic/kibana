/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiFlyout } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import hjson from 'hjson';
import { VegaSpecEditor } from '../components/vega_vis_editor';
import { getNotifications } from '../services';
import { VegaEditorFlyout } from './vega_editor_flyout';

// Exercise real flyout and focus behavior instead of EUI's simplified Jest components.
jest.mock('@elastic/eui', () =>
  jest.requireActual(require.resolve('@elastic/eui/package.json').replace('package.json', 'lib'))
);
jest.mock('@kbn/monaco', () => ({ XJsonLang: { ID: 'json' } }));
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

describe('VegaEditorFlyout', () => {
  const renderFlyout = ({ isNewPanel = false }: { isNewPanel?: boolean } = {}) => {
    const closeFlyout = jest.fn();
    const onRevert = jest.fn();
    const onPreview = jest.fn();
    const onSave = jest.fn();
    const { unmount } = render(
      <I18nProvider>
        <EuiFlyout aria-labelledby="vega-flyout-title" onClose={closeFlyout}>
          <VegaEditorFlyout
            ariaLabelledBy="vega-flyout-title"
            closeFlyout={closeFlyout}
            initialSpec={{ format: 'hjson', value: '{ mark: point }' }}
            isNewPanel={isNewPanel}
            onPreview={onPreview}
            onRevert={onRevert}
            onSave={onSave}
          />
        </EuiFlyout>
      </I18nProvider>
    );
    return { closeFlyout, onRevert, onPreview, onSave, unmount };
  };

  it('does not preview while typing; Preview pushes the current spec', async () => {
    const { onPreview } = renderFlyout();
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: 'Vega' })).toBeInTheDocument();
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
    renderFlyout();
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

  it('enables Apply and close for a new panel so its default spec can be accepted', () => {
    renderFlyout({ isNewPanel: true });
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeEnabled();
  });

  it('saves the current spec, closes, and does not revert on unmount', async () => {
    const { closeFlyout, onPreview, onRevert, onSave, unmount } = renderFlyout();
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
    const { onRevert, unmount } = renderFlyout();
    const user = userEvent.setup();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');
    await user.click(screen.getByTestId('vegaEditorFlyoutPreviewButton')); // previewed but not saved

    unmount();
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it('closes the flyout when Cancel is clicked (revert happens on the ensuing unmount)', async () => {
    const { closeFlyout, onSave, onRevert } = renderFlyout();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('vegaEditorFlyoutCancelButton'));
    expect(closeFlyout).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    // Cancel only closes; the revert is driven by unmount, not the button.
    expect(onRevert).not.toHaveBeenCalled();
  });

  it('places gear then help beneath the title in the header and opens only one popover', async () => {
    renderFlyout();
    const user = userEvent.setup();
    const options = screen.getByRole('button', { name: 'Vega editor options' });
    const help = screen.getByRole('button', { name: 'Vega help' });
    const header = screen.getByTestId('vegaEditorFlyoutHeader');
    expect(within(header).getAllByRole('button')).toEqual([options, help]);
    expect(screen.getAllByRole('button', { name: 'Vega editor options' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Vega help' })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Vega' }).compareDocumentPosition(options)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(within(screen.getByTestId('vega-editor')).queryByRole('button')).not.toBeInTheDocument();
    await user.click(options);
    expect(screen.getByText('Reformat as HJSON')).toBeVisible();
    await user.click(help);
    await waitFor(() => expect(screen.queryByText('Reformat as HJSON')).not.toBeInTheDocument());
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
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Vega help' })).toContainElement(
        document.activeElement as HTMLElement
      )
    );
    await user.click(options);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Vega help' })).not.toBeInTheDocument()
    );
    expect(screen.getByText('Reformat as HJSON')).toBeVisible();
  });

  it.each(['Vega editor options', 'Vega help'])(
    'opens %s with the keyboard and restores focus after Escape',
    async (label) => {
      const { closeFlyout } = renderFlyout();
      const user = userEvent.setup();
      const options = screen.getByRole('button', { name: label });
      act(() => options.focus());
      await user.keyboard('{Enter}');
      expect(screen.getByRole('dialog', { name: label })).toBeVisible();
      await waitFor(() =>
        expect(screen.getByRole('dialog', { name: label })).toContainElement(
          document.activeElement as HTMLElement
        )
      );
      await user.keyboard('{Escape}');
      await waitFor(() => expect(options).toHaveFocus());
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: label })).not.toBeInTheDocument()
      );
      expect(closeFlyout).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['Reformat as HJSON', 'hjson'],
    ['Reformat as JSON, delete comments', 'json'],
  ])('formats the latest text with %s without previewing or saving', async (label, language) => {
    const { onPreview, onSave } = renderFlyout();
    const user = userEvent.setup();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{\n// comment\n"mark": "bar"\n}');
    await user.click(screen.getByRole('button', { name: 'Vega editor options' }));
    await user.click(screen.getByText(label));
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
    const { onPreview, onSave } = renderFlyout();
    const user = userEvent.setup();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ invalid');
    await user.click(screen.getByRole('button', { name: 'Vega editor options' }));
    await user.click(screen.getByText('Reformat as JSON, delete comments'));
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
