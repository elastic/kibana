/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor } from 'monaco-editor';
import { ResizeChecker } from 'ui/resize_checker';
import { EditorActions } from '../components/editor/editor';
import { provideDefinition } from './definition/definition_provider';

import { parseSchema, toCanonicalUrl } from '../../common/uri_util';
import { history } from '../utils/url';
import { EditorService } from './editor_service';
import { HoverController } from './hover/hover_controller';
import { monaco } from './monaco';
import { registerReferencesAction } from './references/references_action';
import { TextModelResolverService } from './textmodel_resolver';

export class MonacoHelper {
  public get initialized() {
    return this.monaco !== null;
  }
  public decorations: string[] = [];
  private monaco: any | null = null;
  private editor: editor.IStandaloneCodeEditor | null = null;
  private resizeChecker: ResizeChecker | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly editorActions: EditorActions
  ) {
    this.handleCopy = this.handleCopy.bind(this);
  }
  public init() {
    return new Promise(resolve => {
      this.monaco = monaco;
      const definitionProvider = {
        provideDefinition(model: any, position: any) {
          return provideDefinition(monaco, model, position);
        },
      };
      this.monaco.languages.registerDefinitionProvider('java', definitionProvider);
      this.monaco.languages.registerDefinitionProvider('typescript', definitionProvider);
      const codeEditorService = new EditorService();
      codeEditorService.setMonacoHelper(this);
      this.editor = monaco.editor.create(
        this.container!,
        {
          readOnly: true,
          minimap: {
            enabled: false,
          },
          hover: {
            enabled: false, // disable default hover;
          },
          occurrencesHighlight: false,
          selectionHighlight: false,
          renderLineHighlight: 'none',
          contextmenu: false,
          folding: false,
        },
        {
          textModelService: new TextModelResolverService(monaco),
          codeEditorService,
        }
      );
      this.resizeChecker = new ResizeChecker(this.container);
      this.resizeChecker.on('resize', () => {
        setTimeout(() => {
          this.editor!.layout();
        });
      });
      registerReferencesAction(this.editor);
      this.editor.onMouseDown((e: editor.IEditorMouseEvent) => {
        if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
          const { uri } = parseSchema(this.editor!.getModel().uri.toString())!;
          history.push(`${uri}!L${e.target.position.lineNumber}:0`);
        }
        this.container.focus();
      });
      const hoverController: HoverController = new HoverController(this.editor);
      hoverController.setReduxActions(this.editorActions);
      document.addEventListener('copy', this.handleCopy);
      document.addEventListener('cut', this.handleCopy);
      resolve(this.editor);
    });
  }

  public destroy = () => {
    this.monaco = null;
    document.removeEventListener('copy', this.handleCopy);
    document.removeEventListener('cut', this.handleCopy);

    if (this.resizeChecker) {
      this.resizeChecker!.destroy();
    }
  };

  public async loadFile(
    repoUri: string,
    file: string,
    text: string,
    lang: string,
    revision: string = 'master'
  ) {
    if (!this.initialized) {
      await this.init();
    }
    const ed = this.editor!;
    const oldModel = ed.getModel();
    if (oldModel) {
      oldModel.dispose();
    }
    ed.setModel(null);
    const uri = this.monaco!.Uri.parse(
      toCanonicalUrl({ schema: 'git:', repoUri, file, revision, pathType: 'blob' })
    );
    let newModel = this.monaco!.editor.getModel(uri);
    if (!newModel) {
      newModel = this.monaco!.editor.createModel(text, lang, uri);
    } else {
      newModel.setValue(text);
    }
    ed.setModel(newModel);
    return ed;
  }

  public revealLine(line: number) {
    this.editor!.revealLineInCenter(line);
    this.editor!.setPosition({
      lineNumber: line,
      column: 1,
    });
    this.decorations = this.editor!.deltaDecorations(this.decorations, [
      {
        range: new this.monaco!.Range(line, 0, line, 0),
        options: {
          isWholeLine: true,
          className: 'highlightLine',
          linesDecorationsClassName: 'markLineNumber',
        },
      },
    ]);
  }

  public revealPosition(line: number, pos: number) {
    const position = {
      lineNumber: line,
      column: pos,
    };
    this.decorations = this.editor!.deltaDecorations(this.decorations, [
      {
        range: new this.monaco!.Range(line, 0, line, 0),
        options: {
          isWholeLine: true,
          className: 'highlightLine',
          linesDecorationsClassName: 'markLineNumber',
        },
      },
    ]);
    this.editor!.revealPositionInCenter(position);
    this.editor!.setPosition(position);
  }

  private handleCopy(e: any) {
    if (
      this.editor &&
      this.editor.hasTextFocus() &&
      this.editor.hasWidgetFocus() &&
      !this.editor.getSelection().isEmpty()
    ) {
      const text = this.editor.getModel().getValueInRange(this.editor.getSelection());
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
    }
  }
}
