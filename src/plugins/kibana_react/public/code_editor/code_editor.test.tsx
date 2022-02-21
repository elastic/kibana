/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl, findTestSubject } from '@kbn/test-jest-helpers';
import { monaco } from '@kbn/monaco';

import { keys } from '@elastic/eui';

// This import needs to come before './code_editor' below as it sets the jest.mocks
import { mockedEditorInstance } from './code_editor.test.helpers';

import { CodeEditor } from './code_editor';

// disabled because this is a test, but also it seems we shouldn't need this?
/* eslint-disable-next-line @kbn/eslint/module_migration */
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';

// A sample language definition with a few example tokens
const simpleLogLang: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\[error.*/, 'constant'],
      [/\[notice.*/, 'variable'],
      [/\[info.*/, 'string'],
      [/\[[a-zA-Z 0-9:]+\]/, 'tag'],
    ],
  },
};

monaco.languages.register({ id: 'loglang' });
monaco.languages.setMonarchTokensProvider('loglang', simpleLogLang);

const logs = `
[Sun Mar 7 20:54:27 2004] [notice] [client xx.xx.xx.xx] This is a notice!
[Sun Mar 7 20:58:27 2004] [info] [client xx.xx.xx.xx] (104)Connection reset by peer: client stopped connection before send body completed
[Sun Mar 7 21:16:17 2004] [error] [client xx.xx.xx.xx] File does not exist: /home/httpd/twiki/view/Main/WebHome
`;

describe('<CodeEditor />', () => {
  test('is rendered', () => {
    const component = mountWithIntl(
      <CodeEditor languageId="loglang" height={250} value={logs} onChange={() => {}} />
    );

    expect(component).toMatchSnapshot();
  });

  test('editor mount setup', () => {
    const suggestionProvider = {
      provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => ({
        suggestions: [],
      }),
    };
    const hoverProvider = {
      provideHover: (model: monaco.editor.ITextModel, position: monaco.Position) => ({
        contents: [],
      }),
    };

    const editorWillMount = jest.fn();

    monaco.languages.onLanguage = jest.fn((languageId, func) => {
      expect(languageId).toBe('loglang');

      // Call the function immediately so we can see our providers
      // get setup without a monaco editor setting up completely
      func();
    }) as any;

    monaco.languages.registerCompletionItemProvider = jest.fn();
    monaco.languages.registerSignatureHelpProvider = jest.fn();
    monaco.languages.registerHoverProvider = jest.fn();

    monaco.editor.defineTheme = jest.fn();

    mountWithIntl(
      <CodeEditor
        languageId="loglang"
        value={logs}
        onChange={() => {}}
        editorWillMount={editorWillMount}
        suggestionProvider={suggestionProvider}
        hoverProvider={hoverProvider}
      />
    );

    // Verify our mount callback will be called
    expect(editorWillMount.mock.calls.length).toBe(1);

    // Verify that both, default and transparent theme will be setup
    expect((monaco.editor.defineTheme as jest.Mock).mock.calls.length).toBe(2);

    // Verify our language features have been registered
    expect((monaco.languages.onLanguage as jest.Mock).mock.calls.length).toBe(1);
    expect((monaco.languages.registerCompletionItemProvider as jest.Mock).mock.calls.length).toBe(
      1
    );
    expect((monaco.languages.registerHoverProvider as jest.Mock).mock.calls.length).toBe(1);
  });

  describe('hint element', () => {
    let component: ReactWrapper;
    const getHint = (): ReactWrapper => findTestSubject(component, 'codeEditorHint');

    beforeEach(() => {
      component = mountWithIntl(
        <CodeEditor languageId="loglang" height={250} value={logs} onChange={() => {}} />
      );
    });

    test('should be tabable', () => {
      const DOMnode = getHint().getDOMNode();
      expect(DOMnode.getAttribute('tabindex')).toBe('0');
      expect(DOMnode).toMatchSnapshot();
    });

    test('should be disabled when the ui monaco editor gains focus', async () => {
      // Initially it is visible and active
      expect((getHint().props() as any).className).not.toContain('isInactive');

      getHint().simulate('keydown', { key: keys.ENTER });

      expect((getHint().props() as any).className).toContain('isInactive');
    });

    test('should be enabled when hitting the ESC key', () => {
      getHint().simulate('keydown', { key: keys.ENTER });

      expect((getHint().props() as any).className).toContain('isInactive');

      findTestSubject(component, 'monacoEditorTextarea').simulate('keydown', {
        keyCode: monaco.KeyCode.Escape,
      });

      expect((getHint().props() as any).className).not.toContain('isInactive');
    });

    test('should detect that the suggestion menu is open and not show the hint on ESC', async () => {
      getHint().simulate('keydown', { key: keys.ENTER });

      expect((getHint().props() as any).className).toContain('isInactive');
      expect(mockedEditorInstance?.__helpers__.areSuggestionsVisible()).toBe(false);

      // Show the suggestions in the editor
      mockedEditorInstance?.__helpers__.showSuggestions();
      expect(mockedEditorInstance?.__helpers__.areSuggestionsVisible()).toBe(true);

      // Hitting the ESC key with the suggestions visible
      findTestSubject(component, 'monacoEditorTextarea').simulate('keydown', {
        keyCode: monaco.KeyCode.Escape,
      });

      expect(mockedEditorInstance?.__helpers__.areSuggestionsVisible()).toBe(false);

      // The keyboard hint is still **not** active
      expect((getHint().props() as any).className).toContain('isInactive');

      // Hitting a second time the ESC key should now show the hint
      findTestSubject(component, 'monacoEditorTextarea').simulate('keydown', {
        keyCode: monaco.KeyCode.Escape,
      });

      expect((getHint().props() as any).className).not.toContain('isInactive');
    });
  });

  /**
   * Test whether our custom placeholder widget is being mounted based on our React logic. We cannot do a full
   * test with Monaco so the parts handled by Monaco are all mocked out and we just check whether the element is mounted
   * in the DOM.
   */
  describe('placeholder element', () => {
    let component: ReactWrapper;
    const getPlaceholderDomElement = (): HTMLElement | null =>
      component.getDOMNode().querySelector('.kibanaCodeEditor__placeholderContainer');

    beforeEach(() => {
      component = mountWithIntl(
        <CodeEditor
          languageId="loglang"
          height={250}
          value=""
          onChange={() => {}}
          placeholder="myplaceholder"
        />
      );
    });

    it('displays placeholder element when placeholder text is provided', () => {
      expect(getPlaceholderDomElement()?.innerText).toBe('myplaceholder');
    });

    it('does not display placeholder element when placeholder text is not provided', () => {
      component.setProps({ ...component.props(), placeholder: undefined, value: '' });
      component.update();
      expect(getPlaceholderDomElement()).toBe(null);
    });

    it('does not display placeholder element when user input has been provided', () => {
      component.setProps({ ...component.props(), value: 'some input' });
      component.update();
      expect(getPlaceholderDomElement()).toBe(null);
    });
  });
});
