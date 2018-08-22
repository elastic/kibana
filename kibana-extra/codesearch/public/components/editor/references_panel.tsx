/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiButtonIcon, EuiPanel, EuiTitle } from '@elastic/eui';
import { entries, groupBy } from 'lodash';
import { IPosition } from 'monaco-editor';
import React from 'react';
import { parseLspUri } from '../../../common/uri_util';
import { CodeAndLocation } from '../../actions';
import { history } from '../../utils/url';
import { CodeBlock } from '../codeblock/codeblock';

interface Props {
  isLoading: boolean;
  title: string;
  references: CodeAndLocation[];
  onClose(): void;
}

export class ReferencesPanel extends React.Component<Props> {
  public close = () => {
    this.props.onClose();
  };

  public render() {
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
        {this.renderGroupByRepo()}
      </EuiPanel>
    );
  }

  private renderGroupByRepo() {
    const groups = groupBy(this.props.references, 'repo');
    return (
      <div className="autoOverflow">
        {entries(groups).map((entry: any) => this.renderReferences(entry[0], entry[1]))}
      </div>
    );
  }

  private renderReferences(repo: string, references: CodeAndLocation[]) {
    return (
      <EuiAccordion
        id={repo}
        buttonClassName="euiAccordionForm__button"
        buttonContent={repo}
        paddingSize="l"
      >
        {references.map(ref => this.renderReference(ref))}
      </EuiAccordion>
    );
  }

  private renderReference(ref: CodeAndLocation) {
    return (
      <CodeBlock
        key={ref.location.uri}
        language={ref.language}
        startLine={ref.startLine}
        code={ref.code}
        file={ref.path}
        onClick={this.onCodeClick.bind(this, ref.location.uri)}
      >
        {ref.code}
      </CodeBlock>
    );
  }

  private onCodeClick(uri: string, pos: IPosition) {
    const { repoUri, revision, file } = parseLspUri(uri);
    history.push(`/${repoUri}/blob/${revision}/${file}!L${pos.lineNumber}:0`);
  }
}
