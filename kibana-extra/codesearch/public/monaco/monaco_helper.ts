/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initMonaco, Monaco } from 'init-monaco';
import { editor, languages } from 'monaco-editor';
import { ResizeChecker } from 'ui/resize_checker';
import { Definition, Location } from 'vscode-languageserver';
import { LspRestClient, TextDocumentMethods } from '../../common/lsp_client';
import { parseUri } from '../../common/uri_util';
import { EditorService } from './editor_service';
import { HoverController } from './hover_controller';
import { TextModelResolverService } from './textmodel_resolver';

export class MonacoHelper {
  private monaco: Monaco | null = null;
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
      initMonaco((monaco, extensions) => {
        this.monaco = monaco;
        extensions.registerEditorContribution(HoverController);

        // @ts-ignore  a hack to replace function in monaco editor.
        monaco.StandaloneCodeEditorServiceImpl.prototype.openCodeEditor =
          EditorService.prototype.openCodeEditor;
        //  @ts-ignore another hack to replace function
        this.monaco!.typescript.DefinitionAdapter.prototype.provideDefinition = (model, position) =>
          this.provideDefinition(model, position);

        this.editor = monaco.editor.create(
          this.container!,
          {
            readOnly: true,
            minimap: {
              enabled: false,
            },
            hover: {
              enabled: false,
            }, // disable default hover;
            contextmenu: false,
          },
          {
            textModelService: new TextModelResolverService(monaco),
          }
        );
        this.resizeChecker = new ResizeChecker(this.container);
        this.resizeChecker.on('resize', () => {
          setTimeout(() => {
            this.editor!.layout();
          });
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

    this.editor!.setModel(null);
    const uri = this.monaco!.Uri.parse(`git://${repoUri}?${revision}#${file}`);
    let newModel = this.monaco!.editor.getModel(uri);
    if (!newModel) {
      newModel = this.monaco!.editor.createModel(text, lang, uri);
    }
    this.editor!.setModel(newModel);
    return this.editor!;
  }

  public provideDefinition(model: editor.ITextModel, position: any): Promise<languages.Location[]> {
    const { repoUri, file } = parseUri(model.uri);
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
