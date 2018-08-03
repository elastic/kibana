/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { MonacoHelper } from '../../monaco/monaco_helper';

interface Props {
  file: string;
  repoUri: string;
  revision: string;
  goto?: string;
}

export class Editor extends React.Component<Props> {
  private container: HTMLElement | undefined;
  private monaco: MonacoHelper | undefined;

  constructor(props: Props, context: any) {
    super(props, context);
  }

  public componentDidMount(): void {
    this.container = ReactDOM.findDOMNode(this) as HTMLElement;
    this.monaco = new MonacoHelper(this.container);
    this.loadFile(this.props.repoUri, this.props.file, this.props.revision);
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (nextProps.file !== this.props.file) {
      this.loadFile(nextProps.repoUri, nextProps.file, nextProps.revision);
    }
    if (nextProps.goto && nextProps.goto !== this.props.goto) {
      this.revealPosition(nextProps.goto);
    }
  }

  public render() {
    return <div className="editorContainer"/>;
  }

  private loadFile(repo: string, file: string, revision: string) {
    fetch(`../api/cs/repo/${repo}/blob/${revision}/${file}`).then((response: Response) => {
      if (response.status === 200) {
        const contentType = response.headers.get('Content-Type');

        if (contentType && contentType.startsWith('text/')) {
          let lang = contentType.split(';')[0].substring('text/'.length);
          if (lang === 'typescript') {
            lang = 'ts';
          }
          if (lang === 'javascript') {
            lang = 'js';
          }
          response.text().then(text => this.loadText(text, repo, file, lang));
        } else if (contentType && contentType.startsWith('image/')) {
          alert('show image!');
        }
      }
    });
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
}
