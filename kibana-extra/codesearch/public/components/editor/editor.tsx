/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexItem } from '@elastic/eui';
import { connect } from 'react-redux';
import { Hover, TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import {
  closeReferences,
  CodeAndLocation,
  fetchFile,
  FetchFilePayload,
  findReferences,
  hoverResult,
} from '../../actions';
import { MonacoHelper } from '../../monaco/monaco_helper';
import { RootState } from '../../reducers';
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
  goto?: string;
  isReferencesOpen: boolean;
  isReferencesLoading: boolean;
  references: CodeAndLocation[];
  fileContent?: string;
  fileLanguage?: string;
  hover?: Hover;
  fetchFile(payload: FetchFilePayload): void;
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
    this.props.fetchFile({
      uri: this.props.repoUri,
      path: this.props.file,
      revision: this.props.revision,
    });
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (nextProps.file !== this.props.file || nextProps.revision !== this.props.revision) {
      this.props.fetchFile({
        uri: nextProps.repoUri,
        path: nextProps.file,
        revision: nextProps.revision,
      });
    }
    if (nextProps.goto && nextProps.goto !== this.props.goto) {
      this.revealPosition(nextProps.goto);
    }
    if (nextProps.fileContent !== this.props.fileContent) {
      this.loadText(
        nextProps.fileContent!,
        nextProps.repoUri,
        nextProps.file,
        nextProps.fileLanguage!
      );
    }
  }

  public componentWillUnmount() {
    this.monaco!.destroy();
  }
  public render() {
    return (
      <EuiFlexItem className="noOverflow">
        <EuiFlexItem grow={true} className="editorContainer noOverflow" id="mainEditor" />
        {this.renderReferences()}
      </EuiFlexItem>
    );
  }

  private async loadText(text: string, repo: string, file: string, lang: string) {
    if (this.monaco) {
      await this.monaco.loadFile(repo, file, text, lang);
      if (this.props.goto) {
        this.revealPosition(this.props.goto);
      }
    }
  }

  private revealPosition(goto: string) {
    const regex = /L(\d+)(:\d+)?$/;
    const m = regex.exec(goto);
    if (this.monaco && m) {
      const line = parseInt(m[1], 10);
      if (m[2]) {
        const pos = parseInt(m[2].substring(1), 10);
        this.monaco.revealPosition(line, pos);
      } else {
        this.monaco.revealLine(line);
      }
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
        />
      )
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  fileContent: state.file.fileContent,
  fileLanguage: state.file.fileLanguage,
  isReferencesOpen: state.editor.showing,
  isReferencesLoading: state.editor.loading,
  references: state.editor.references,
  hover: state.editor.hover,
});

const mapDispatchToProps = {
  closeReferences,
  findReferences,
  fetchFile,
  hoverResult,
};

export const Editor = connect(
  mapStateToProps,
  mapDispatchToProps
)(EditorComponent);
