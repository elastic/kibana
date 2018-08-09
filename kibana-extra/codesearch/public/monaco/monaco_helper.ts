/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initMonaco, Monaco } from 'init-monaco';
import { editor, IDisposable, languages } from 'monaco-editor';
import { ResizeChecker } from 'ui/resize_checker';
import { Definition, Hover, Location } from 'vscode-languageserver';
import { LspRestClient, TextDocumentMethods } from '../../common/lsp_client';
import { EditorService } from './editor_service';
import { TextModelResolverService } from './textmodel_resolver';

export class MonacoHelper {
  private monaco: Monaco | null = null;
  private hoverProvider: IDisposable | null = null;
  private definitionProvider: IDisposable | null = null;
  private lspMethods: TextDocumentMethods;
  private editor: editor.IStandaloneCodeEditor | null = null;
  private resizeChecker: ResizeChecker | null = null;

  constructor(private readonly container: HTMLElement) {
    const lspClient = new LspRestClient('../api/lsp');
    this.lspMethods = new TextDocumentMethods(lspClient);
  }
  public get initialized() {
    return this.monaco !== null;
  }
  public init() {
    return new Promise(resolve => {
      initMonaco(monaco => {
        this.monaco = monaco;
        this.editor = monaco.editor.create(
          this.container!,
          {
            readOnly: true,
          },
          {
            textModelService: new TextModelResolverService(monaco),
            editorService: new EditorService(),
          }
        );
        this.resizeChecker = new ResizeChecker(this.container);
        this.resizeChecker.on('resize', () => {
          this.editor!.layout();
        });
        resolve(this.editor);
      });
    });
  }

  public destroy = () => {
    this.monaco = null;
    this.resizeChecker!.destroy();
  };

  public async loadFile(
    repoUri: string,
    file: string,
    text: string,
    lang: string,
    revision: string = 'HEAD'
  ) {
    if (!this.initialized) {
      await this.init();
    }
    if (lang !== 'plain') {
      if (this.hoverProvider) {
        this.hoverProvider.dispose();
      }
      this.hoverProvider = this.monaco!.languages.registerHoverProvider(lang, {
        provideHover: (model, position) => this.onHover(repoUri, file, model, position),
      });
      if (this.definitionProvider) {
        this.definitionProvider.dispose();
      }
      this.definitionProvider = this.monaco!.languages.registerDefinitionProvider(lang, {
        provideDefinition: (model, position) =>
          this.provideDefinition(repoUri, file, model, position),
      });
    }
    // @ts-ignore
    this.editor!.setModel(null);
    const uri = this.monaco!.Uri.parse(`git://${repoUri}?${revision}#${file}`);
    let newModel = this.monaco!.editor.getModel(uri);
    if (!newModel) {
      newModel = this.monaco!.editor.createModel(text, lang, uri);
    }
    this.editor!.setModel(newModel);
    return this.editor!;
  }
  public provideDefinition(
    repoUri: string,
    file: string,
    model: any,
    position: any
  ): Promise<languages.Location[]> {
    return this.lspMethods.definition
      .send({
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
        textDocument: {
          uri: `git://${repoUri}?HEAD#${file}`,
        },
      })
      .then(
        (definition: Definition) => {
          if (definition) {
            if (Array.isArray(definition)) {
              return definition.map(l => this.handleLocation(l));
            } else {
              return [this.handleLocation(definition)];
            }
          } else {
            return [];
          }
        },
        (_: any) => {
          return [];
        }
      );
  }

  public onHover(
    repoUri: string,
    file: string,
    model: any,
    position: any
  ): Promise<languages.Hover> {
    return this.lspMethods.hover
      .send({
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
        textDocument: {
          uri: `git://${repoUri}?HEAD#${file}`,
        },
      })
      .then(
        (hover: Hover) => {
          if (hover.contents && hover.range) {
            const { range, contents } = hover;
            return {
              range: new this.monaco!.Range(
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
                contents: [
                  {
                    value: typeof contents === 'string' ? contents : contents.value,
                  },
                ],
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

  public revealLine(line: number) {
    this.editor!.revealLineInCenter(line);
    this.editor!.setPosition({
      lineNumber: line,
      column: 1,
    });
  }

  public revealPosition(line: number, pos: number) {
    const position = {
      lineNumber: line,
      column: pos,
    };
    this.editor!.revealPositionInCenter(position);
    this.editor!.setPosition(position);
  }

  private handleLocation(location: Location): languages.Location {
    return {
      uri: this.monaco!.Uri.parse(location.uri),
      range: {
        startLineNumber: location.range.start.line + 1,
        startColumn: location.range.start.character + 1,
        endLineNumber: location.range.end.line + 1,
        endColumn: location.range.end.character + 1,
      },
    };
  }
}
