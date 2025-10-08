/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { MarkdownEditorProps } from './markdown_editor';
import { MarkdownEditor } from './markdown_editor';
import userEvent from '@testing-library/user-event';
import { MarkdownEditorPreviewSwitch } from './markdown_editor_preview_switch';
import { faker } from '@faker-js/faker';

const FIRST_LINE_LENGTH = 10;
const testTitle = `#${faker.lorem.word({ length: FIRST_LINE_LENGTH - 1 })}`;
const testParagraphs = faker.lorem.paragraphs(3);

const testedContent = `${testTitle}\n\n${testParagraphs}`;

const contentLength = testedContent.length;

const renderMarkdownEditor = (overrideProps?: Partial<MarkdownEditorProps>) => {
  const isEditing$ = new BehaviorSubject(true);
  const isPreview$ = new BehaviorSubject(false);
  return render(
    <>
      <MarkdownEditorPreviewSwitch
        isEditing$={isEditing$}
        isPreview$={isPreview$}
        onSwitch={(isPreview: boolean) => {
          isPreview$.next(isPreview);
        }}
      />
      <MarkdownEditor
        processingPluginList={[]}
        content={testedContent}
        onCancel={jest.fn()}
        onSave={jest.fn()}
        isPreview$={isPreview$}
        {...overrideProps}
      />
    </>
  );
};

it('calls onCancel when Discard button clicked', async () => {
  const onCancel = jest.fn();
  renderMarkdownEditor({ onCancel });

  const discardButton = screen.getByRole('button', { name: /Discard/i });
  await userEvent.click(discardButton);

  expect(onCancel).toHaveBeenCalled();
});

it('calls onSave with current value when Apply clicked', async () => {
  const onSave = jest.fn();
  renderMarkdownEditor({ onSave });

  expect(screen.getByRole('button', { name: /Apply/i })).toBeDisabled();
  const textarea = await screen.findByRole('textbox');
  await userEvent.type(textarea, ' Added Paragraph');
  await userEvent.click(screen.getByRole('button', { name: /Apply/i }));
  expect(onSave).toHaveBeenCalledWith(testedContent + ' Added Paragraph');
});

// this is a guard to not accidentally change the implementation so we can keep the scroll position for editor when switching between editor/preview mode
it('does not unmount editor DOM when switching to preview', async () => {
  renderMarkdownEditor();

  const textarea = await screen.findByRole('textbox');
  expect(textarea).toBeInTheDocument();

  // Switch to preview
  await userEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);

  // The textarea still exists in the DOM but is hidden by CSS
  expect(textarea).toBeInTheDocument();
});

describe('MarkdownEditor a11y', () => {
  it('links aria-describedby to footer help text', () => {
    renderMarkdownEditor();

    // Find the editor by role
    const editor = screen.getByLabelText(/Dashboard markdown editor/i);

    // Check it has the correct aria-describedby
    const describedById = editor.getAttribute('aria-describedby');
    expect(describedById).toBe('generated-id_markdownEditorFooterHelp');

    // The help text exists in the DOM
    const helpText = document.getElementById(describedById!);
    expect(helpText).toBeInTheDocument();
    expect(helpText?.textContent).toMatch(/Press Apply/i);
    expect(screen.getByRole('button', { name: /Discard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/i })).toBeInTheDocument();
  });
});

describe('MarkdownEditor caret position', () => {
  it('places caret position at the end of first line by default', async () => {
    renderMarkdownEditor();
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.focus();
    expect(textarea.selectionStart).toBe(FIRST_LINE_LENGTH);
  });
  it('tracks caret position on click', async () => {
    renderMarkdownEditor();
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.focus();

    const clickInsideTextAreaPosition = 34;

    // Click to move caret to index 5
    textarea.setSelectionRange(clickInsideTextAreaPosition, clickInsideTextAreaPosition);
    textarea.dispatchEvent(new Event('click', { bubbles: true }));
    expect(textarea.selectionStart).toBe(clickInsideTextAreaPosition);
    expect(textarea).toBe(document.activeElement);
    await userEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);
    expect(textarea).not.toBe(document.activeElement);
    await userEvent.click(screen.getAllByRole('button', { name: 'Editor' })[0]);
    expect(textarea).toBe(document.activeElement);
    expect(textarea.selectionStart).toBe(clickInsideTextAreaPosition);
  });

  it('tracks caret after typing', async () => {
    renderMarkdownEditor();

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.focus();
    const word = faker.lorem.word();
    await userEvent.type(textarea, word);

    await userEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);
    expect(textarea === document.activeElement).toBe(false);
    await userEvent.click(screen.getAllByRole('button', { name: 'Editor' })[0]);
    expect(textarea.selectionStart).toBe(contentLength + word.length);
  });
});
