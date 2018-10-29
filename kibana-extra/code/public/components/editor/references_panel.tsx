/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiButtonIcon, EuiLoadingKibana, EuiPanel, EuiTitle } from '@elastic/eui';
import { entries, groupBy } from 'lodash';
import { IPosition } from 'monaco-editor';
import queryString from 'query-string';
import React from 'react';
import { parseSchema } from '../../../common/uri_util';
import { CodeAndLocation } from '../../actions';
import { history } from '../../utils/url';
import { CodeBlock } from '../codeblock/codeblock';

interface Props {
  isLoading: boolean;
  title: string;
  references: CodeAndLocation[];
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
    const groups = groupBy(this.props.references, 'repo');
    return entries(groups).map((entry: any) => this.renderReferences(entry[0], entry[1]));
  }

  private renderReferences(repo: string, references: CodeAndLocation[]) {
    return (
      <EuiAccordion
        id={repo}
        key={repo}
        buttonClassName="euiAccordionForm__button"
        buttonContent={repo}
        paddingSize="l"
        initialIsOpen={true}
      >
        {references.map(ref => this.renderReference(ref))}
      </EuiAccordion>
    );
  }

  private renderReference(ref: CodeAndLocation) {
    const key = `${ref.location.uri}?L${ref.location.range.start.line}:${
      ref.location.range.start.character
    }`;
    return (
      <CodeBlock
        key={key}
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

  private onCodeClick(url: string, pos: IPosition) {
    const { uri } = parseSchema(url)!;

    const queries = queryString.parse(history.location.search);
    const query = queryString.stringify({
      ...queries,
      tab: 'references',
      refUrl: this.props.refUrl,
    });
    history.push(`${uri}!L${pos.lineNumber}:0?${query}`);
  }
}
