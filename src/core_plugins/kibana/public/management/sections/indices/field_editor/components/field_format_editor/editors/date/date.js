import React, { PureComponent } from 'react';

class DateFormatEditor extends PureComponent {
  static formatId = 'date';

  render() {
    return 'hello date';
  }
}

export const DateEditor = () => DateFormatEditor;
