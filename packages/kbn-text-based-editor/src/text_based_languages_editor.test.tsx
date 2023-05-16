/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { IUiSettingsClient } from '@kbn/core/public';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  TextBasedLanguagesEditor,
  TextBasedLanguagesEditorProps,
} from './text_based_languages_editor';

describe('TextBasedLanguagesEditor', () => {
  const uiConfig: Record<string, any> = {};
  const uiSettings = {
    get: (key: string) => uiConfig[key],
  } as IUiSettingsClient;

  const services = {
    uiSettings,
    settings: {
      client: uiSettings,
    },
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
      query: { sql: 'SELECT * FROM test' },
      isCodeEditorExpanded: false,
      onTextLangQueryChange: jest.fn(),
      onTextLangQuerySubmit: jest.fn(),
      expandCodeEditor: jest.fn(),
    };
  });
  it('should  render the editor component', async () => {
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
      expect(component.find('[data-test-subj="TextBasedLangEditor"]').length).not.toBe(0);
    });
  });

  it('should  render the lines badge for the inline mode by default', async () => {
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-inline-lines-badge"]').length
      ).not.toBe(0);
    });
  });

  it('should  render the errors badge for the inline mode by default if errors are provides', async () => {
    const newProps = {
      ...props,
      errors: [new Error('error1')],
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-inline-errors-badge"]').length
      ).not.toBe(0);
    });
  });

  it('should render the correct buttons for the inline code editor mode', async () => {
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
      expect(component.find('[data-test-subj="TextBasedLangEditor-expand"]').length).not.toBe(0);
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-inline-documentation"]').length
      ).not.toBe(0);
    });
  });

  it('should call the expand editor function when expand button is clicked', async () => {
    const expandCodeEditorSpy = jest.fn();
    const newProps = {
      ...props,
      expandCodeEditor: expandCodeEditorSpy,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      findTestSubject(component, 'TextBasedLangEditor-expand').simulate('click');
      expect(expandCodeEditorSpy).toHaveBeenCalled();
    });
  });

  it('should render the correct buttons for the expanded code editor mode', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-toggleWordWrap"]').length
      ).not.toBe(0);
      expect(component.find('[data-test-subj="TextBasedLangEditor-minimize"]').length).not.toBe(0);
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-documentation"]').length
      ).not.toBe(0);
    });
  });

  it('should call the expand editor function when minimize button is clicked', async () => {
    const expandCodeEditorSpy = jest.fn();
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
      expandCodeEditor: expandCodeEditorSpy,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      findTestSubject(component, 'TextBasedLangEditor-minimize').simulate('click');
      expect(expandCodeEditorSpy).toHaveBeenCalled();
    });
  });

  it('should render the resize for the expanded code editor mode', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(component.find('[data-test-subj="TextBasedLangEditor-resize"]').length).not.toBe(0);
    });
  });

  it('should render the footer for the expanded code editor mode', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(component.find('[data-test-subj="TextBasedLangEditor-footer"]').length).not.toBe(0);
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-footer-lines"]').at(0).text()
      ).toBe('1 line');
    });
  });
});
