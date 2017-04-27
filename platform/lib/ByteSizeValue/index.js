// @flow

type ByteSizeValueUnit = 'b' | 'kb' | 'mb' | 'gb';

function renderUnit(value: number, unit: ByteSizeValueUnit) {
  const prettyValue = Number(value.toFixed(2));
  return `${prettyValue}${unit}`;
}

export class ByteSizeValue {
  valueInBytes: number;

  constructor(valueInBytes: number) {
    this.valueInBytes = valueInBytes;
  }

  isGreaterThan(other: ByteSizeValue): boolean {
    return this.valueInBytes > other.valueInBytes;
  }

  isLessThan(other: ByteSizeValue): boolean {
    return this.valueInBytes < other.valueInBytes;
  }

  isEqualTo(other: ByteSizeValue): boolean {
    return this.valueInBytes === other.valueInBytes;
  }

  getValueInBytes(): number {
    return this.valueInBytes;
  }

  toString(returnUnit?: ByteSizeValueUnit) {
    let value = this.valueInBytes;
    let unit = `b`;

    for (const nextUnit: ByteSizeValueUnit of ['kb', 'mb', 'gb']) {
      if (unit === returnUnit || (returnUnit == null && value < 1024)) {
        return renderUnit(value, unit);
      }

      value = value / 1024;
      unit = nextUnit;
    }

    return renderUnit(value, unit);
  }

  static parse(text: string): ByteSizeValue {
    const match = /([1-9][0-9]*)(b|kb|mb|gb)/.exec(text);
    if (!match) {
      throw new Error(
        `could not parse byte size value [${text}]. value must start with a ` +
          `number and end with bytes size unit, e.g. 10kb, 23mb, 3gb, 239493b`
      );
    }

    const value = parseInt(match[1]);
    const unit: ByteSizeValueUnit = match[2];

    const unitMultiplier = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024
    };

    return new ByteSizeValue(value * unitMultiplier[unit]);
  }
}

export const bytes = (value: number) => new ByteSizeValue(value);
export const kb = (value: number) => bytes(value * 1024);
export const mb = (value: number) => kb(value * 1024);
export const gb = (value: number) => mb(value * 1024);
export const tb = (value: number) => gb(value * 1024);
