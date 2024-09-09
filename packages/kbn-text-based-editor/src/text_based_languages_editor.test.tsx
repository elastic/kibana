/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { IUiSettingsClient } from '@kbn/core/public';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { TextBasedLanguagesEditor } from './text_based_languages_editor';
import type { TextBasedLanguagesEditorProps } from './types';
import { ReactWrapper } from 'enzyme';

jest.mock('./helpers', () => {
  const module = jest.requireActual('./helpers');
  return {
    ...module,
    getDocumentationSections: () => ({
      groups: [
        {
          label: 'How it works',
          items: [],
        },
      ],
    }),
  };
});
import { of } from 'rxjs';

describe('TextBasedLanguagesEditor', () => {
  const uiConfig: Record<string, any> = {};
  const uiSettings = {
    get: (key: string) => uiConfig[key],
  } as IUiSettingsClient;
  const theme = {
    theme$: of({ darkMode: false }),
  };

  const services = {
    uiSettings,
    settings: {
      client: uiSettings,
    },
    theme,
  };

  function renderTextBasedLanguagesEditorComponent(testProps: TextBasedLanguagesEditorProps) {
    return (
      <KibanaContextProvider services={services}>
        <TextBasedLanguagesEditor {...testProps} />
      </KibanaContextProvider>
    );
  }
  let props: TextBasedLanguagesEditorProps;

  beforeEach(() => {
    props = {
      query: { esql: 'from test' },
      onTextLangQueryChange: jest.fn(),
      onTextLangQuerySubmit: jest.fn(),
    };
  });
  it('should  render the editor component', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="TextBasedLangEditor"]').length).not.toBe(0);
  });

  it('should  render the date info with no @timestamp found', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(
      component.find('[data-test-subj="TextBasedLangEditor-date-info"]').at(0).text()
    ).toStrictEqual('@timestamp not found');
  });

  it('should  render the feedback link', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="TextBasedLangEditor-feedback-link"]').length).not.toBe(
      0
    );
  });

  it('should not render the date info if hideTimeFilterInfo is set to true', async () => {
    const newProps = {
      ...props,
      hideTimeFilterInfo: true,
    };
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="TextBasedLangEditor-date-info"]').length).toBe(0);
  });

  it('should render the date info with @timestamp found if detectedTimestamp is given', async () => {
    const newProps = {
      ...props,
      detectedTimestamp: '@timestamp',
    };
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    expect(
      component.find('[data-test-subj="TextBasedLangEditor-date-info"]').at(0).text()
    ).toStrictEqual('@timestamp found');
  });

  it('should  render the limit information', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(
      component.find('[data-test-subj="TextBasedLangEditor-limit-info"]').at(0).text()
    ).toStrictEqual('LIMIT 1000 rows');
  });

  it('should render the query history action if isLoading is defined', async () => {
    const newProps = {
      ...props,
      isLoading: true,
    };
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    expect(
      component.find('[data-test-subj="TextBasedLangEditor-toggle-query-history-button-container"]')
        .length
    ).not.toBe(0);
  });

  it('should not render the query history action if isLoading is undefined', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(
      component.find('[data-test-subj="TextBasedLangEditor-toggle-query-history-button-container"]')
        .length
    ).toBe(0);
  });

  it('should not render the query history action if hideQueryHistory is set to true', async () => {
    const newProps = {
      ...props,
      hideQueryHistory: true,
    };
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    expect(
      component.find('[data-test-subj="TextBasedLangEditor-toggle-query-history-button-container"]')
        .length
    ).toBe(0);
  });

  it('should render the correct buttons for the expanded code editor mode', async () => {
    let component: ReactWrapper;
    await act(async () => {
      component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    });
    component!.update();
    expect(
      component!.find('[data-test-subj="TextBasedLangEditor-toggleWordWrap"]').length
    ).not.toBe(0);
    expect(component!.find('[data-test-subj="TextBasedLangEditor-documentation"]').length).not.toBe(
      0
    );
  });

  it('should render the resize for the expanded code editor mode', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="TextBasedLangEditor-resize"]').length).not.toBe(0);
  });

  it('should render the footer for the expanded code editor mode', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="TextBasedLangEditor-footer"]').length).not.toBe(0);
    expect(component.find('[data-test-subj="TextBasedLangEditor-footer-lines"]').at(0).text()).toBe(
      '1 line'
    );
  });

  it('should render the run query text', async () => {
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="TextBasedLangEditor-run-query"]').length).not.toBe(0);
  });

  it('should not render the run query text if the hideRunQueryText prop is set to true', async () => {
    const newProps = {
      ...props,
      hideRunQueryText: true,
    };
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="TextBasedLangEditor-run-query"]').length).toBe(0);
  });

  it('should render correctly if editorIsInline prop is set to true', async () => {
    const onTextLangQuerySubmit = jest.fn();
    const newProps = {
      ...props,
      hideRunQueryText: true,
      editorIsInline: true,
      onTextLangQuerySubmit,
    };
    const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="TextBasedLangEditor-run-query"]').length).toBe(0);
    expect(
      component.find('[data-test-subj="TextBasedLangEditor-run-query-button"]').length
    ).not.toBe(1);
    findTestSubject(component, 'TextBasedLangEditor-run-query-button').simulate('click');
    expect(onTextLangQuerySubmit).toHaveBeenCalled();
  });
});
