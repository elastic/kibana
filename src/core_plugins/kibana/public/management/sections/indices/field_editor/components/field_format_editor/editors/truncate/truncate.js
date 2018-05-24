import React, { PureComponent } from 'react';

export class TruncateFormatEditor extends PureComponent {
  static formatId = 'truncate';

  render() {
    return 'hello truncate';
  }
}

export const TruncateEditor = () => TruncateFormatEditor;
