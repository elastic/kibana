import React, { PureComponent } from 'react';

export class UrlFormatEditor extends PureComponent {
  static formatId = 'url';

  render() {
    return 'hello url';
  }
}

export const UrlEditor = () => UrlFormatEditor;
