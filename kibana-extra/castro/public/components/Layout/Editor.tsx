/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { LspRestClient, TextDocumentMethods } from '../../../common/LspClient';

import { initMonaco, Monaco } from 'init-monaco';

interface Props {
  file: string;
  blob: string;
}

export default class Editor extends React.Component<Props> {
  private lspMethods: TextDocumentMethods;
  private container: Element;

  constructor(props: Props, context: any) {
    super(props, context);
    const lspClient = new LspRestClient('../api/lsp', { 'kbn-xsrf': '1' });
    this.lspMethods = new TextDocumentMethods(lspClient);
  }

  public componentDidMount(): void {
    this.container = ReactDOM.findDOMNode(this) as Element;
    const r = window.require;
    r.config({ paths: { vs: '../monaco/vs' } });

    initMonaco(monaco => {
      monaco.languages.registerHoverProvider('typescript', {
        provideHover: (model, position) => this.onHover(monaco, model, position),
      });

      this.editor = monaco.editor.create(this.container, {
        value: this.props.blob,
        language: 'typescript',
        readOnly: true,
      });
    });
  }

  public onHover(monaco: Monaco, model, position: monaco.Position) {
    return this.lspMethods.hover
      .send({
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
        textDocument: {
          uri: `file://${this.props.file}`,
        },
      })
      .then(
        hover => {
          if (hover.contents.length > 0) {
            const { range, contents } = hover;

            return {
              range: new monaco.Range(
                range.start.line + 1,
                range.start.character + 1,
                range.end.line + 1,
                range.end.character + 1
              ),
              contents: (contents as any[]).reverse().map(e => {
                return { value: e.value || e.toString() };
              }),
            };
          } else {
            return null;
          }
        },
        err => {
          // noop
        }
      );
  }

  public render() {
    return <div style={{ height: 600 }} />;
  }
}
