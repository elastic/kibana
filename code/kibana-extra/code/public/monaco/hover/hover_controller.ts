/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor as Editor, IDisposable, IKeyboardEvent } from 'monaco-editor';
import IEditorContribution = Editor.IEditorContribution;
import ICodeEditor = Editor.ICodeEditor;
import IEditorMouseEvent = Editor.IEditorMouseEvent;
import { EditorActions } from '../../components/editor/editor';
import { ContentHoverWidget } from './content_hover_widget';

export class HoverController implements IEditorContribution {
  public static ID = 'code.editor.contrib.hover';
  public static get(editor: any): HoverController {
    return editor.getContribution(HoverController.ID);
  }
  private contentWidget: ContentHoverWidget;
  private disposables: IDisposable[];

  constructor(readonly editor: ICodeEditor) {
    this.disposables = [
      this.editor.onMouseMove((e: IEditorMouseEvent) => this.onEditorMouseMove(e)),
      this.editor.onKeyDown((e: IKeyboardEvent) => this.onKeyDown(e)),
    ];
    this.contentWidget = new ContentHoverWidget(editor);
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  public getId(): string {
    return HoverController.ID;
  }

  public setReduxActions(actions: EditorActions) {
    this.contentWidget.setHoverResultAction(actions.hoverResult);
  }

  private onEditorMouseMove(mouseEvent: IEditorMouseEvent) {
    const targetType = mouseEvent.target.type;
    const { MouseTargetType } = window.monaco.editor;

    if (
      targetType === MouseTargetType.CONTENT_WIDGET &&
      mouseEvent.target.detail === ContentHoverWidget.ID
    ) {
      return;
    }

    if (targetType === MouseTargetType.CONTENT_TEXT) {
      this.contentWidget.startShowingAt(mouseEvent.target.range, false);
    } else {
      this.contentWidget.hide();
    }
  }

  private onKeyDown(e: IKeyboardEvent): void {
    if (e.keyCode === window.monaco.KeyCode.Escape) {
      // Do not hide hover when Ctrl/Meta is pressed
      this.contentWidget.hide();
    }
  }
}
