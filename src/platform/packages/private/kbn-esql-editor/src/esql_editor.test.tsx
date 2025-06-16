/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import { IUiSettingsClient } from '@kbn/core/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ESQLEditor } from './esql_editor';
import type { ESQLEditorProps } from './types';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

describe('ESQLEditor', () => {
  const uiConfig: Record<string, any> = {};
  const uiSettings = {
    get: (key: string) => uiConfig[key],
  } as IUiSettingsClient;

  const corePluginMock = coreMock.createStart();
  corePluginMock.chrome.getActiveSolutionNavId$.mockReturnValue(new BehaviorSubject('oblt'));
  const services = {
    uiSettings,
    settings: {
      client: uiSettings,
    },
    core: corePluginMock,
    data: dataPluginMock.createStartContract(),
  };

  function renderESQLEditorComponent(testProps: ESQLEditorProps) {
    return (
      <KibanaContextProvider services={services}>
        <ESQLEditor {...testProps} />
      </KibanaContextProvider>
    );
  }
  let props: ESQLEditorProps;

  beforeEach(() => {
    props = {
      query: { esql: 'from test' },
      onTextLangQueryChange: jest.fn(),
      onTextLangQuerySubmit: jest.fn(),
    };
  });
  it('should  render the editor component', async () => {
    const { getByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    expect(getByTestId('ESQLEditor')).toBeInTheDocument();
  });

  it('should  render the date info with no @timestamp found', async () => {
    const { getByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    expect(getByTestId('ESQLEditor-date-info')).toHaveTextContent('@timestamp not found');
  });

  it('should  render the feedback link', async () => {
    const { getByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    expect(getByTestId('ESQLEditor-feedback-link')).toBeInTheDocument();
  });

  it('should not render the date info if hideTimeFilterInfo is set to true', async () => {
    const newProps = {
      ...props,
      hideTimeFilterInfo: true,
    };
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...newProps }));
    expect(queryByTestId('ESQLEditor-date-info')).not.toBeInTheDocument();
  });

  it('should render the date info with @timestamp found if detectedTimestamp is given', async () => {
    const newProps = {
      ...props,
      detectedTimestamp: '@timestamp',
    };
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...newProps }));
    expect(queryByTestId('ESQLEditor-date-info')).toHaveTextContent('@timestamp found');
  });

  it('should  render the limit information', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    expect(queryByTestId('ESQLEditor-limit-info')).toHaveTextContent('LIMIT 1000 rows');
  });

  it('should not render the query history action if hideQueryHistory is set to true', async () => {
    const newProps = {
      ...props,
      hideQueryHistory: true,
    };
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...newProps }));
    expect(
      queryByTestId('ESQLEditor-toggle-query-history-button-container')
    ).not.toBeInTheDocument();
  });

  it('should render the correct buttons for the expanded code editor mode', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    const toggleWordWrapButton = queryByTestId('ESQLEditor-toggleWordWrap');
    expect(toggleWordWrapButton).toBeInTheDocument();
  });

  it('should render the resize for the expanded code editor mode', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    expect(queryByTestId('ESQLEditor-resize')).toBeInTheDocument();
  });

  it('should render the footer for the expanded code editor mode', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    expect(queryByTestId('ESQLEditor-footer')).toBeInTheDocument();
    expect(queryByTestId('ESQLEditor-footer-lines')).toHaveTextContent('1 line');
  });

  it('should render the run query text', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...props }));
    expect(queryByTestId('ESQLEditor-run-query')).toBeInTheDocument();
  });

  it('should render the doc icon if the displayDocumentationAsFlyout is true', async () => {
    const newProps = {
      ...props,
      displayDocumentationAsFlyout: true,
      editorIsInline: false,
    };
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...newProps }));
    expect(queryByTestId('ESQLEditor-documentation')).toBeInTheDocument();
  });

  it('should not render the run query text if the hideRunQueryText prop is set to true', async () => {
    const newProps = {
      ...props,
      hideRunQueryText: true,
    };
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...newProps }));
    expect(queryByTestId('ESQLEditor-run-query')).not.toBeInTheDocument();
  });

  it('should render correctly if editorIsInline prop is set to true', async () => {
    const onTextLangQuerySubmit = jest.fn();
    const newProps = {
      ...props,
      hideRunQueryText: true,
      editorIsInline: true,
      onTextLangQuerySubmit,
    };
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...newProps }));
    expect(queryByTestId('ESQLEditor-run-query')).not.toBeInTheDocument();

    const runQueryButton = queryByTestId('ESQLEditor-run-query-button');
    expect(runQueryButton).toBeInTheDocument(); // Assert it exists

    if (runQueryButton) {
      await userEvent.click(runQueryButton);
      expect(onTextLangQuerySubmit).toHaveBeenCalledTimes(1);
    }
  });

  it('should not render the run query button if the hideRunQueryButton prop is set to true and editorIsInline prop is set to true', async () => {
    const newProps = {
      ...props,
      hideRunQueryButton: true,
      editorIsInline: true,
    };
    const { queryByTestId } = renderWithI18n(renderESQLEditorComponent({ ...newProps }));
    expect(queryByTestId('ESQLEditor-run-query-button')).not.toBeInTheDocument();
  });
});
