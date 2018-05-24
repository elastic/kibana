import React, { PureComponent } from 'react';

export class ColorFormatEditor extends PureComponent {
  static formatId = 'color';

  render() {
    return 'hello color';
  }
}

export const ColorEditor = () => ColorFormatEditor;
