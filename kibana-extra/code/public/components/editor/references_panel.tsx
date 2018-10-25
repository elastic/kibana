/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiButtonIcon, EuiLoadingKibana, EuiPanel, EuiTitle } from '@elastic/eui';
import { range } from 'lodash';
import { IPosition, IRange } from 'monaco-editor';
import queryString from 'query-string';
import React from 'react';
import { parseSchema } from '../../../common/uri_util';
import { CodeAndLocation, GroupedFileReferences, GroupedRepoReferences } from '../../actions';
import { history } from '../../utils/url';
import { CodeBlock } from '../codeblock/codeblock';

interface Props {
  isLoading: boolean;
  title: string;
  references: GroupedRepoReferences[];
  refUrl?: string;
  onClose(): void;
}

export class ReferencesPanel extends React.Component<Props> {
  public close = () => {
    this.props.onClose();
  };

  public render() {
    const body = this.props.isLoading ? <EuiLoadingKibana size="xl" /> : this.renderGroupByRepo();

    return (
      <EuiPanel grow={false} className="referencesPanel">
        <EuiButtonIcon
          className="euiFlyout__closeButton"
          size="s"
          onClick={this.close}
          iconType="cross"
          aria-label="Next"
        />
        <EuiTitle size="s">
          <h3>{this.props.title}</h3>
        </EuiTitle>
        <div className="autoOverflow">{body}</div>
      </EuiPanel>
    );
  }

  private renderGroupByRepo() {
    return this.props.references.map((ref: GroupedRepoReferences) => {
      return this.renderReferenceRepo(ref);
    });
  }

  private renderReferenceRepo({ repo, files }: GroupedRepoReferences) {
    return (
      <EuiAccordion
        id={repo}
        key={repo}
        buttonClassName="euiAccordionForm__button"
        buttonContent={repo}
        paddingSize="l"
        initialIsOpen={true}
      >
        {files.map(file => this.renderReference(file))}
      </EuiAccordion>
    );
  }

  private renderReference(file: GroupedFileReferences) {
    const key = `${file.path}`;
    let text: string = '';
    let lineMappings: string[] = [];
    const highlightRanges: IRange[] = [];
    const pushCodes = (code: CodeAndLocation) => {
      text = text + code.code + '\n';
      const lines = range(code.lineRange.startLine + 1, code.lineRange.endLine + 1).map(
        v => `${v}`
      );
      lineMappings = lineMappings.concat(lines);
      for (const l of code.locations) {
        const startLineNumber = lineMappings.indexOf(`${l.range.start.line + 1}`) + 1;
        const endLineNumber = lineMappings.indexOf(`${l.range.end.line + 1}`) + 1;
        highlightRanges.push({
          startLineNumber,
          endLineNumber,
          startColumn: l.range.start.character + 1,
          endColumn: l.range.end.character + 1,
        });
      }
    };
    const pushPlaceholder = () => {
      text = text + '\n';
      lineMappings.push('...');
    };
    for (const code of file.codes) {
      if (!(text === '' && code.lineRange.startLine === 0)) {
        pushPlaceholder();
      }
      pushCodes(code);
    }
    pushPlaceholder();
    const lineNumberFn = (l: number) => {
      return lineMappings[l - 1];
    };
    return (
      <CodeBlock
        key={key}
        language={file.language}
        startLine={0}
        code={text}
        file={file.path}
        folding={false}
        lineNumbersFunc={lineNumberFn}
        highlightRanges={highlightRanges}
        onClick={this.onCodeClick.bind(this, lineMappings, file.codes[0].locations[0].uri)}
      />
    );
  }

  private onCodeClick(lineNumbers: string[], url: string, pos: IPosition) {
    const { uri } = parseSchema(url)!;
    const line = lineNumbers[pos.lineNumber - 1];
    if (line !== '...') {
      const queries = queryString.parse(history.location.search);
      const query = queryString.stringify({
        ...queries,
        tab: 'references',
        refUrl: this.props.refUrl,
      });
      history.push(`${uri}!L${line}:0?${query}`);
    }
  }
}
