import React, { PureComponent } from 'react';

export class DurationFormatEditor extends PureComponent {
  static formatId = 'duration';

  render() {
    return 'hello duration';
  }
}

export const DurationEditor = () => DurationFormatEditor;
