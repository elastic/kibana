/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EsqlEditorActions } from './editor_actions_context';
import { EsqlEditorActionsProvider, useEsqlEditorActions } from './editor_actions_context';
import { EsqlEditorActionsRegister } from './editor_actions_register';

const Consumer = () => {
  const actions = useEsqlEditorActions();
  if (!actions) {
    return <div data-test-subj="no-actions" />;
  }
  return (
    <div>
      <div data-test-subj="currentQuery">{actions.currentQuery}</div>
      <div data-test-subj="isHistoryOpen">{String(actions.isHistoryOpen)}</div>
      <div data-test-subj="isCurrentQueryStarred">{String(actions.isCurrentQueryStarred)}</div>
      <div data-test-subj="canToggleStarredQuery">{String(actions.canToggleStarredQuery)}</div>
      <div data-test-subj="editorIsInline">{String(actions.editorIsInline)}</div>
      <button
        type="button"
        data-test-subj="submit"
        onClick={() => actions.submitEsqlQuery('FROM submitted')}
      />
      <button type="button" data-test-subj="visor" onClick={() => actions.toggleVisor()} />
    </div>
  );
};

describe('EsqlEditorActionsRegister', () => {
  it('registers the provided actions into the surrounding provider', () => {
    const submitEsqlQuery = jest.fn();
    render(
      <EsqlEditorActionsProvider>
        <EsqlEditorActionsRegister
          currentQuery="FROM logs-*"
          submitEsqlQuery={submitEsqlQuery}
          isHistoryOpen
          canToggleStarredQuery
        />
        <Consumer />
      </EsqlEditorActionsProvider>
    );

    expect(screen.getByTestId('currentQuery')).toHaveTextContent('FROM logs-*');
    expect(screen.getByTestId('isHistoryOpen')).toHaveTextContent('true');
    expect(screen.getByTestId('canToggleStarredQuery')).toHaveTextContent('true');

    fireEvent.click(screen.getByTestId('submit'));
    expect(submitEsqlQuery).toHaveBeenCalledWith('FROM submitted');
  });

  it('falls back to safe defaults for unset fields', () => {
    render(
      <EsqlEditorActionsProvider>
        <EsqlEditorActionsRegister />
        <Consumer />
      </EsqlEditorActionsProvider>
    );

    // Flags default to false and the query to an empty string.
    expect(screen.getByTestId('currentQuery')).toHaveTextContent('');
    expect(screen.getByTestId('isHistoryOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('isCurrentQueryStarred')).toHaveTextContent('false');
    expect(screen.getByTestId('canToggleStarredQuery')).toHaveTextContent('false');
    expect(screen.getByTestId('editorIsInline')).toHaveTextContent('false');

    // Unset handlers default to no-ops, so invoking them is safe.
    expect(() => {
      fireEvent.click(screen.getByTestId('submit'));
      fireEvent.click(screen.getByTestId('visor'));
    }).not.toThrow();
  });

  it('unregisters the actions on unmount', () => {
    const { rerender } = render(
      <EsqlEditorActionsProvider>
        <EsqlEditorActionsRegister currentQuery="FROM logs-*" />
        <Consumer />
      </EsqlEditorActionsProvider>
    );
    expect(screen.getByTestId('currentQuery')).toBeInTheDocument();

    rerender(
      <EsqlEditorActionsProvider>
        <Consumer />
      </EsqlEditorActionsProvider>
    );
    expect(screen.getByTestId('no-actions')).toBeInTheDocument();
  });

  it('registers a stable object that reflects prop changes without re-registering', () => {
    const seen: EsqlEditorActions[] = [];
    const CaptureActions = () => {
      const actions = useEsqlEditorActions();
      if (actions) {
        seen.push(actions);
      }
      return <div data-test-subj="currentQuery">{actions?.currentQuery}</div>;
    };

    const { rerender } = render(
      <EsqlEditorActionsProvider>
        <EsqlEditorActionsRegister currentQuery="FROM a" />
        <CaptureActions />
      </EsqlEditorActionsProvider>
    );
    expect(screen.getByTestId('currentQuery')).toHaveTextContent('FROM a');

    rerender(
      <EsqlEditorActionsProvider>
        <EsqlEditorActionsRegister currentQuery="FROM b" />
        <CaptureActions />
      </EsqlEditorActionsProvider>
    );
    // The live value is read through the getter on the next render...
    expect(screen.getByTestId('currentQuery')).toHaveTextContent('FROM b');
    // ...but the registered object identity never changes (no re-registration churn).
    expect(new Set(seen).size).toBe(1);
  });

  it('is inert (no throw) when rendered without a provider', () => {
    expect(() =>
      render(
        <>
          <EsqlEditorActionsRegister currentQuery="FROM logs-*" submitEsqlQuery={jest.fn()} />
          <Consumer />
        </>
      )
    ).not.toThrow();
    // Without a provider the context stays null.
    expect(screen.getByTestId('no-actions')).toBeInTheDocument();
  });
});
