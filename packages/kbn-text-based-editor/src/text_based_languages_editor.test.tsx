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

  it('should  render the date info with no @timestamp detected', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-date-info"]').at(0).text()
      ).toStrictEqual('@timestamp not detected');
    });
  });

  it('should render the date info with @timestamp detected if detectTimestamp is true', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
      detectTimestamp: true,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-date-info"]').at(0).text()
      ).toStrictEqual('@timestamp detected');
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

  it('should render the warnings badge for the inline mode by default if warning are provides', async () => {
    const newProps = {
      ...props,
      warning: 'Line 1: 20: Warning',
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-inline-warning-badge"]').length
      ).not.toBe(0);
    });
  });

  it('should render the correct buttons for the inline code editor mode', async () => {
    let component: ReactWrapper;

    await act(async () => {
      component = mount(renderTextBasedLanguagesEditorComponent({ ...props }));
    });
    component!.update();
    expect(component!.find('[data-test-subj="TextBasedLangEditor-expand"]').length).not.toBe(0);
    expect(
      component!.find('[data-test-subj="TextBasedLangEditor-inline-documentation"]').length
    ).not.toBe(0);
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
    let component: ReactWrapper;
    await act(async () => {
      component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    });
    component!.update();
    expect(
      component!.find('[data-test-subj="TextBasedLangEditor-toggleWordWrap"]').length
    ).not.toBe(0);
    expect(component!.find('[data-test-subj="TextBasedLangEditor-minimize"]').length).not.toBe(0);
    expect(component!.find('[data-test-subj="TextBasedLangEditor-documentation"]').length).not.toBe(
      0
    );
  });

  it('should not render the minimize button for the expanded code editor mode if the prop is set to true', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
      hideMinimizeButton: true,
    };
    let component: ReactWrapper;
    await act(async () => {
      component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
    });
    component!.update();
    await act(async () => {
      expect(
        component.find('[data-test-subj="TextBasedLangEditor-toggleWordWrap"]').length
      ).not.toBe(0);
      expect(component.find('[data-test-subj="TextBasedLangEditor-minimize"]').length).toBe(0);
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

  it('should render the run query text', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(component.find('[data-test-subj="TextBasedLangEditor-run-query"]').length).not.toBe(0);
    });
  });

  it('should not render the run query text if the hideRunQueryText prop is set to true', async () => {
    const newProps = {
      ...props,
      isCodeEditorExpanded: true,
      hideRunQueryText: true,
    };
    await act(async () => {
      const component = mount(renderTextBasedLanguagesEditorComponent({ ...newProps }));
      expect(component.find('[data-test-subj="TextBasedLangEditor-run-query"]').length).toBe(0);
    });
  });
});
