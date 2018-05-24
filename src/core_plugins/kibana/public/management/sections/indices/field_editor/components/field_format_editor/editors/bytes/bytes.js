import { NumberFormatEditor } from '../number/number';

export class BytesFormatEditor extends NumberFormatEditor {
  static formatId = 'bytes';

  constructor(props) {
    super(props);

    this.state = {
      ...this.state,
      sampleInputs: [256, 1024, 5150000, 1990000000],
    };
  }
}

export const BytesEditor = () => BytesFormatEditor;
