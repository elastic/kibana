/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../application/models/legacy_core_editor/legacy_core_editor.test.mocks';

import RowParser from './row_parser';
import { create, MODE } from '../application/models';
import type { SenseEditor } from '../application/models';
import type { CoreEditor } from '../types';

describe('RowParser', () => {
  let editor: SenseEditor | null;
  let parser: RowParser | null;

  beforeEach(function () {
    // Set up our document body
    document.body.innerHTML = `<div>
        <div id="ConAppEditor" />
         <div id="ConAppEditorActions" />
        <div id="ConCopyAsCurl" />
      </div>`;
    editor = create(document.getElementById('ConAppEditor')!);
    parser = new RowParser(editor.getCoreEditor() as CoreEditor);
  });

  afterEach(function () {
    editor?.getCoreEditor().destroy();
    editor = null;
    parser = null;
  });

  describe('getRowParseMode', () => {
    const forceRetokenize = false;

    it('should return MODE.BETWEEN_REQUESTS if line is empty', () => {
      editor?.getCoreEditor().setValue('', forceRetokenize);
      expect(parser?.getRowParseMode()).toBe(MODE.BETWEEN_REQUESTS);
    });

    it('should return MODE.BETWEEN_REQUESTS if line is a comment', () => {
      editor?.getCoreEditor().setValue('// comment', forceRetokenize);
      expect(parser?.getRowParseMode()).toBe(MODE.BETWEEN_REQUESTS);
    });

    it('should return MODE.REQUEST_START | MODE.REQUEST_END if line is a single line request', () => {
      editor?.getCoreEditor().setValue('GET _search', forceRetokenize);
      // eslint-disable-next-line no-bitwise
      expect(parser?.getRowParseMode()).toBe(MODE.REQUEST_START | MODE.REQUEST_END);
    });

    it('should return MODE.IN_REQUEST if line is a request with an opening curly brace', () => {
      editor?.getCoreEditor().setValue('{', forceRetokenize);
      expect(parser?.getRowParseMode()).toBe(MODE.IN_REQUEST);
    });

    it('should return MODE.MULTI_DOC_CUR_DOC_END | MODE.IN_REQUEST if line is a multi doc request with an opening curly brace', () => {
      editor?.getCoreEditor().setValue('GET _msearch\n{}\n{', forceRetokenize);
      const lineNumber = editor?.getCoreEditor().getLineCount()! - 1;
      expect(parser?.getRowParseMode(lineNumber)).toBe(
        // eslint-disable-next-line no-bitwise
        MODE.MULTI_DOC_CUR_DOC_END | MODE.IN_REQUEST
      );
    });

    it('should return MODE.MULTI_DOC_CUR_DOC_END | MODE.REQUEST_END if line is a multi doc request with a closing curly brace', () => {
      editor?.getCoreEditor().setValue('GET _msearch\n{}\n{"foo": 1}\n', forceRetokenize);
      const lineNumber = editor?.getCoreEditor().getLineCount()! - 1;
      expect(parser?.getRowParseMode(lineNumber)).toBe(
        // eslint-disable-next-line no-bitwise
        MODE.MULTI_DOC_CUR_DOC_END | MODE.REQUEST_END
      );
    });

    it('should return MODE.REQUEST_START | MODE.REQUEST_END if line is a request with variables', () => {
      editor?.getCoreEditor().setValue('GET /${exampleVariable}', forceRetokenize);
      // eslint-disable-next-line no-bitwise
      expect(parser?.getRowParseMode()).toBe(MODE.REQUEST_START | MODE.REQUEST_END);
    });

    it('should return MODE.REQUEST_START | MODE.REQUEST_END if a single request line ends with a closing curly brace', () => {
      editor?.getCoreEditor().setValue('DELETE <foo>/_bar/_baz%{test}', forceRetokenize);
      // eslint-disable-next-line no-bitwise
      expect(parser?.getRowParseMode()).toBe(MODE.REQUEST_START | MODE.REQUEST_END);
    });

    it('should return correct modes for multiple bulk requests', () => {
      editor
        ?.getCoreEditor()
        .setValue('POST _bulk\n{"index": {"_index": "test"}}\n{"foo": "bar"}\n', forceRetokenize);
      expect(parser?.getRowParseMode(0)).toBe(MODE.BETWEEN_REQUESTS);
      editor
        ?.getCoreEditor()
        .setValue('POST _bulk\n{"index": {"_index": "test"}}\n{"foo": "bar"}\n', forceRetokenize);
      const lineNumber = editor?.getCoreEditor().getLineCount()! - 1;
      expect(parser?.getRowParseMode(lineNumber)).toBe(
        // eslint-disable-next-line no-bitwise
        MODE.REQUEST_END | MODE.MULTI_DOC_CUR_DOC_END
      );
    });
  });
});
