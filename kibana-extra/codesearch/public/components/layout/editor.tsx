/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';

import { initMonaco, Monaco } from 'init-monaco';
import { Hover } from 'vscode-languageserver';

interface Props {
  file: string;
  repoUri: string;
}

export class Editor extends React.Component<Props> {
  private lspMethods: TextDocumentMethods;
  private container: HTMLElement | undefined;
  private editor: any | undefined;

  constructor(props: Props, context: any) {
    super(props, context);
    const lspClient = new LspRestClient('../api/lsp');
    this.lspMethods = new TextDocumentMethods(lspClient);
  }

  public componentDidMount(): void {
    this.container = ReactDOM.findDOMNode(this) as HTMLElement;
    this.loadFile(this.props.repoUri, this.props.file);
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (this.editor && nextProps.file !== this.props.file) {
      this.loadFile(nextProps.repoUri, nextProps.file);
    }
  }
  // #todo figure out how specify type for `model` and `position`
  public onHover(monaco: Monaco, model: any, position: any) {
    return this.lspMethods.hover
      .send({
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
        textDocument: {
          uri: `git://${this.props.repoUri}?HEAD#${this.props.file}`,
        },
      })
      .then((hover: Hover) => {
        if (hover.contents && hover.range) {
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
          return { contents: [] };
        }
      });
  }

  public render() {
    return <div style={{ height: 600 }} />;
  }

  private loadFile(repo: string, file: string) {
    fetch(`../api/cs/repo/${repo}/blob/head/${file}`).then((response: Response) => {
      if (response.status === 200) {
        const contentType = response.headers.get('Content-Type');

        if (contentType && contentType.startsWith('text/')) {
          response.text().then(text => this.loadText(text));
        } else if (contentType && contentType.startsWith('image/')) {
          alert('show image!');
        }
      }
    });
  }

  private loadText(text: string) {
    if (this.editor) {
      this.editor.setValue(text);
    } else {
      this.initEditor(text);
    }
  }

  private initEditor(text: string) {
    initMonaco(monaco => {
      monaco.languages.registerHoverProvider('typescript', {
        provideHover: (model, position) => this.onHover(monaco, model, position),
      });

      this.editor = monaco.editor.create(this.container!, {
        value: text,
        language: 'typescript',
        readOnly: true,
      });
    });
  }
}
