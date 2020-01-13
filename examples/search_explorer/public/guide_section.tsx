/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import { EuiTab, EuiTabs, EuiCodeBlock } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiHorizontalRule } from '@elastic/eui';

export interface CodeSection {
  title: string;
  code: Array<{ description?: string; snippet: string }> | string;
}

interface Props {
  demo?: React.ReactNode;
  codeSections?: CodeSection[];
}

interface State {
  selectedTab: string;
}

export class GuideSection extends React.Component<Props, State> {
  private tabs: Array<{ name: string; displayName: string }>;

  constructor(props: Props) {
    super(props);

    if (!props.demo && !props.codeSections) {
      throw new Error('Must supply either demo or code sections');
    }

    if (props.demo) {
      this.tabs = [
        {
          name: 'demo',
          displayName: 'Demo',
        },
      ];
    } else {
      this.tabs = [];
    }

    if (props.codeSections) {
      props.codeSections.forEach(section => {
        this.tabs.push({
          name: section.title,
          displayName: section.title,
        });
      });
    }

    this.state = {
      selectedTab: this.tabs[0].name,
    };
  }

  onSelectedTabChanged = (selectedTab: string) => {
    this.setState({
      selectedTab,
    });
  };

  renderTabs() {
    return this.tabs.map(tab => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.name)}
        isSelected={tab.name === this.state.selectedTab}
        key={tab.name}
      >
        {tab.displayName}
      </EuiTab>
    ));
  }

  removeLicenseBlock(code: string) {
    return code.replace(/\/\*[\w\'\s\r\n\*\.\,\(\)\"\;\:\/\-]*\s*\//m, '');
  }

  renderCodeBlocks() {
    if (!this.props.codeSections) {
      return undefined;
    }
    const section = this.props.codeSections.find(s => s.title === this.state.selectedTab);

    if (!section) {
      throw new Error('No section named ' + this.state.selectedTab);
    }
    const code = section.code;
    if (typeof code === 'string') {
      return <EuiCodeBlock language="ts">{this.removeLicenseBlock(code)}</EuiCodeBlock>;
    }

    return code.map((codeBlock, i) => (
      <React.Fragment key={i}>
        <EuiSpacer />
        <h3>{codeBlock.description}</h3>
        <EuiCodeBlock language="ts">{this.removeLicenseBlock(codeBlock.snippet)}</EuiCodeBlock>
        <EuiHorizontalRule />
      </React.Fragment>
    ));
  }

  renderContent() {
    if (this.state.selectedTab === 'demo') {
      return this.props.demo;
    } else if (this.props.codeSections) {
      return this.renderCodeBlocks();
    }
  }

  render() {
    return (
      <React.Fragment>
        <EuiTabs>{this.renderTabs()}</EuiTabs>
        {this.renderContent()}
      </React.Fragment>
    );
  }
}
