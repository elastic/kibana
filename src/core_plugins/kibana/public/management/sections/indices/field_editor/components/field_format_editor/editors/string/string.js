import React, { PureComponent } from 'react';

export class StringFormatEditor extends PureComponent {
  static formatId = 'string';

  render() {
    return 'hello string';
  }
}

export const StringEditor = () => StringFormatEditor;
