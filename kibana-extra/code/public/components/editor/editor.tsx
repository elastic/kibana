/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexItem } from '@elastic/eui';
import { connect } from 'react-redux';
import { Hover, Position, TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { closeReferences, CodeAndLocation, findReferences, hoverResult } from '../../actions';
import { MonacoHelper } from '../../monaco/monaco_helper';
import { RootState } from '../../reducers';
import { refUrlSelector } from '../../selectors';
import { ReferencesPanel } from './references_panel';

export interface EditorActions {
  closeReferences(): void;
  findReferences(params: TextDocumentPositionParams): void;
  hoverResult(hover: Hover): void;
}

interface Props extends EditorActions {
  file: string;
  repoUri: string;
  revision: string;
  revealPosition?: Position;
  isReferencesOpen: boolean;
  isReferencesLoading: boolean;
  references: CodeAndLocation[];
  fileContent?: string;
  fileLanguage?: string;
  hover?: Hover;
  refUrl?: string;
}

export class EditorComponent extends React.Component<Props> {
  private container: HTMLElement | undefined;
  private monaco: MonacoHelper | undefined;

  constructor(props: Props, context: any) {
    super(props, context);
  }

  public componentDidMount(): void {
    this.container = document.getElementById('mainEditor') as HTMLElement;
    this.monaco = new MonacoHelper(this.container, this.props);
    if (this.props.fileContent) {
      this.loadText(
        this.props.fileContent!,
        this.props.repoUri,
        this.props.file,
        this.props.fileLanguage!,
        this.props.revision
      ).then(() => {
        if (this.props.revealPosition) {
          this.revealPosition(this.props.revealPosition);
        }
      });
    }
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (nextProps.revealPosition && nextProps.revealPosition !== this.props.revealPosition) {
      this.revealPosition(nextProps.revealPosition);
    }
    if (nextProps.fileContent && nextProps.fileContent !== this.props.fileContent) {
      this.loadText(
        nextProps.fileContent,
        nextProps.repoUri,
        nextProps.file,
        nextProps.fileLanguage!,
        nextProps.revision
      ).then(() => {
        if (nextProps.revealPosition) {
          this.revealPosition(nextProps.revealPosition);
        }
      });
    }
  }

  public componentWillUnmount() {
    this.monaco!.destroy();
  }
  public render() {
    return (
      <EuiFlexItem className="noOverflow">
        <EuiFlexItem
          tabIndex={0}
          grow={true}
          className="editorContainer noOverflow"
          id="mainEditor"
        />
        {this.renderReferences()}
      </EuiFlexItem>
    );
  }

  private async loadText(text: string, repo: string, file: string, lang: string, revision: string) {
    if (this.monaco) {
      await this.monaco.loadFile(repo, file, text, lang, revision);
    }
  }

  private revealPosition({ line, character }: Position) {
    if (this.monaco) {
      this.monaco.revealPosition(line, character);
    }
  }

  private getTitleFromHover() {
    const { hover } = this.props;
    if (hover) {
      let content;
      if (Array.isArray(hover.contents)) {
        content = hover.contents[0];
      } else {
        content = hover.contents;
      }
      if (typeof content === 'string') {
        return content;
      } else if (content && content.value) {
        return content.value;
      }
    }
    return '';
  }

  private renderReferences() {
    return (
      this.props.isReferencesOpen && (
        <ReferencesPanel
          onClose={this.props.closeReferences}
          references={this.props.references}
          isLoading={this.props.isReferencesLoading}
          title={this.getTitleFromHover()}
          refUrl={this.props.refUrl}
        />
      )
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  file: state.file.file!.payload.path,
  repoUri: state.file.file!.payload.uri,
  revision: state.file.file!.payload.revision,
  fileContent: state.file.file!.content,
  fileLanguage: state.file.file!.lang,
  isReferencesOpen: state.editor.showing,
  isReferencesLoading: state.editor.loading,
  references: state.editor.references,
  hover: state.editor.hover,
  refUrl: refUrlSelector(state),
  revealPosition: state.editor.revealPosition,
});

const mapDispatchToProps = {
  closeReferences,
  findReferences,
  hoverResult,
};

export const Editor = connect(
  mapStateToProps,
  mapDispatchToProps
)(EditorComponent);
