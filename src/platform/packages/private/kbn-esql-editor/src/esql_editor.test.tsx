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
import { ESQLEditor } from './esql_editor';
import type { ESQLEditorProps } from './types';
import { ReactWrapper } from 'enzyme';
import { coreMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

describe('ESQLEditor', () => {
  const uiConfig: Record<string, any> = {};
  const uiSettings = {
    get: (key: string) => uiConfig[key],
  } as IUiSettingsClient;

  const services = {
    uiSettings,
    settings: {
      client: uiSettings,
    },
    core: coreMock.createStart(),
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
    const component = mount(renderESQLEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="ESQLEditor"]').length).not.toBe(0);
  });

  it('should  render the date info with no @timestamp found', async () => {
    const component = mount(renderESQLEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="ESQLEditor-date-info"]').at(0).text()).toStrictEqual(
      '@timestamp not found'
    );
  });

  it('should  render the feedback link', async () => {
    const component = mount(renderESQLEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="ESQLEditor-feedback-link"]').length).not.toBe(0);
  });

  it('should not render the date info if hideTimeFilterInfo is set to true', async () => {
    const newProps = {
      ...props,
      hideTimeFilterInfo: true,
    };
    const component = mount(renderESQLEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="ESQLEditor-date-info"]').length).toBe(0);
  });

  it('should render the date info with @timestamp found if detectedTimestamp is given', async () => {
    const newProps = {
      ...props,
      detectedTimestamp: '@timestamp',
    };
    const component = mount(renderESQLEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="ESQLEditor-date-info"]').at(0).text()).toStrictEqual(
      '@timestamp found'
    );
  });

  it('should  render the limit information', async () => {
    const component = mount(renderESQLEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="ESQLEditor-limit-info"]').at(0).text()).toStrictEqual(
      'LIMIT 1000 rows'
    );
  });

  it('should not render the query history action if hideQueryHistory is set to true', async () => {
    const newProps = {
      ...props,
      hideQueryHistory: true,
    };
    const component = mount(renderESQLEditorComponent({ ...newProps }));
    expect(
      component.find('[data-test-subj="ESQLEditor-toggle-query-history-button-container"]').length
    ).toBe(0);
  });

  it('should render the correct buttons for the expanded code editor mode', async () => {
    let component: ReactWrapper;
    await act(async () => {
      component = mount(renderESQLEditorComponent({ ...props }));
    });
    component!.update();
    expect(component!.find('[data-test-subj="ESQLEditor-toggleWordWrap"]').length).not.toBe(0);
  });

  it('should render the resize for the expanded code editor mode', async () => {
    const component = mount(renderESQLEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="ESQLEditor-resize"]').length).not.toBe(0);
  });

  it('should render the footer for the expanded code editor mode', async () => {
    const component = mount(renderESQLEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="ESQLEditor-footer"]').length).not.toBe(0);
    expect(component.find('[data-test-subj="ESQLEditor-footer-lines"]').at(0).text()).toBe(
      '1 line'
    );
  });

  it('should render the run query text', async () => {
    const component = mount(renderESQLEditorComponent({ ...props }));
    expect(component.find('[data-test-subj="ESQLEditor-run-query"]').length).not.toBe(0);
  });

  it('should render the doc icon if the displayDocumentationAsFlyout is true', async () => {
    const newProps = {
      ...props,
      displayDocumentationAsFlyout: true,
      editorIsInline: false,
    };
    const component = mount(renderESQLEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="ESQLEditor-documentation"]').length).not.toBe(0);
  });

  it('should not render the run query text if the hideRunQueryText prop is set to true', async () => {
    const newProps = {
      ...props,
      hideRunQueryText: true,
    };
    const component = mount(renderESQLEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="ESQLEditor-run-query"]').length).toBe(0);
  });

  it('should render correctly if editorIsInline prop is set to true', async () => {
    const onTextLangQuerySubmit = jest.fn();
    const newProps = {
      ...props,
      hideRunQueryText: true,
      editorIsInline: true,
      onTextLangQuerySubmit,
    };
    const component = mount(renderESQLEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="ESQLEditor-run-query"]').length).toBe(0);
    expect(component.find('[data-test-subj="ESQLEditor-run-query-button"]').length).not.toBe(1);
    findTestSubject(component, 'ESQLEditor-run-query-button').simulate('click');
    expect(onTextLangQuerySubmit).toHaveBeenCalled();
  });

  it('should not render the run query button if the hideRunQueryButton prop is set to true and editorIsInline prop is set to true', async () => {
    const newProps = {
      ...props,
      hideRunQueryButton: true,
      editorIsInline: true,
    };
    const component = mount(renderESQLEditorComponent({ ...newProps }));
    expect(component.find('[data-test-subj="ESQLEditor-run-query-button"]').length).toBe(0);
  });
});
