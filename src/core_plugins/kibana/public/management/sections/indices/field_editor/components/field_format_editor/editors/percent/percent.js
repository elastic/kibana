import { NumberFormatEditor } from '../number/number';

export class PercentFormatEditor extends NumberFormatEditor {
  static formatId = 'percent';

  constructor(props) {
    super(props);

    this.state = {
      ...this.state,
      sampleInputs: [0.10, 0.99999, 1, 100, 1000],
    };
  }
}

export const PercentEditor = () => PercentFormatEditor;
