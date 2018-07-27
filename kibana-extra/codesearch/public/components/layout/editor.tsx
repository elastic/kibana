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
  revision: string;
}

export class Editor extends React.Component<Props> {
  private lspMethods: TextDocumentMethods;
  private container: HTMLElement | undefined;
  private editor: any | undefined;
  private monaco: any;

  constructor(props: Props, context: any) {
    super(props, context);
    const lspClient = new LspRestClient('../api/lsp');
    this.lspMethods = new TextDocumentMethods(lspClient);
  }

  public componentDidMount(): void {
    this.container = ReactDOM.findDOMNode(this) as HTMLElement;
    this.loadFile(this.props.repoUri, this.props.file, this.props.revision);
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (this.editor && nextProps.file !== this.props.file) {
      this.loadFile(nextProps.repoUri, nextProps.file, nextProps.revision);
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
      .then(
        (hover: Hover) => {
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
          } else if (hover.contents) {
            const { contents } = hover;
            if (Array.isArray(contents)) {
              return {
                contents: (contents as any[]).reverse().map(e => {
                  return { value: e.value || e.toString() };
                }),
              };
            } else {
              return {
                contents: [contents],
              };
            }
          } else {
            return { contents: [] };
          }
        },
        _ => {
          return { contents: [] };
        }
      );
  }

  public render() {
    return <div style={{ height: 600 }} />;
  }

  private loadFile(repo: string, file: string, revision: string) {
    fetch(`../api/cs/repo/${repo}/blob/${revision}/${file}`).then((response: Response) => {
      if (response.status === 200) {
        const contentType = response.headers.get('Content-Type');

        if (contentType && contentType.startsWith('text/')) {
          const lang = contentType.split(';')[0].substring('text/'.length);
          response.text().then(text => this.loadText(text, file, lang));
        } else if (contentType && contentType.startsWith('image/')) {
          alert('show image!');
        }
      }
    });
  }

  private loadText(text: string, file: string, lang: string) {
    if (this.editor) {
      const model = this.editor.getModel();
      model.setValue(text);
      this.monaco.editor.setModelLanguage(model, lang);
    } else {
      this.initEditor(text, file, lang);
    }
  }

  private initEditor(text: string, file: string, lang: string) {
    initMonaco(monaco => {
      this.monaco = monaco;
      if (lang !== 'plain') {
        monaco.languages.registerHoverProvider(lang, {
          provideHover: (model, position) => this.onHover(monaco, model, position),
        });
      }

      this.editor = monaco.editor.create(this.container!, {
        value: text,
        language: lang,
        readOnly: true,
      });
    });
  }
}
