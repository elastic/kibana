export type ByteSizeValueUnit = 'b' | 'kb' | 'mb' | 'gb';

const unitMultiplier: { [unit: string]: number } = {
  b: Math.pow(1024, 0),
  gb: Math.pow(1024, 3),
  kb: Math.pow(1024, 1),
  mb: Math.pow(1024, 2),
};

function renderUnit(value: number, unit: string) {
  const prettyValue = Number(value.toFixed(2));
  return `${prettyValue}${unit}`;
}

export class ByteSizeValue {
  constructor(private readonly valueInBytes: number) {
    if (!Number.isSafeInteger(valueInBytes) || valueInBytes < 0) {
      throw new Error(
        `Value in bytes is expected to be a safe positive integer, ` +
          `but provided [${valueInBytes}]`
      );
    }
  }

  public isGreaterThan(other: ByteSizeValue): boolean {
    return this.valueInBytes > other.valueInBytes;
  }

  public isLessThan(other: ByteSizeValue): boolean {
    return this.valueInBytes < other.valueInBytes;
  }

  public isEqualTo(other: ByteSizeValue): boolean {
    return this.valueInBytes === other.valueInBytes;
  }

  public getValueInBytes(): number {
    return this.valueInBytes;
  }

  public toString(returnUnit?: ByteSizeValueUnit) {
    let value = this.valueInBytes;
    let unit = `b`;

    for (const nextUnit of ['kb', 'mb', 'gb']) {
      if (unit === returnUnit || (returnUnit == null && value < 1024)) {
        return renderUnit(value, unit);
      }

      value = value / 1024;
      unit = nextUnit;
    }

    return renderUnit(value, unit);
  }

  public static parse(text: string): ByteSizeValue {
    const match = /([1-9][0-9]*)(b|kb|mb|gb)/.exec(text);
    if (!match) {
      throw new Error(
        `could not parse byte size value [${text}]. value must start with a ` +
          `number and end with bytes size unit, e.g. 10kb, 23mb, 3gb, 239493b`
      );
    }

    const value = parseInt(match[1], 0);
    const unit = match[2];

    return new ByteSizeValue(value * unitMultiplier[unit]);
  }
}

export const bytes = (value: number) => new ByteSizeValue(value);
export const kb = (value: number) => bytes(value * 1024);
export const mb = (value: number) => kb(value * 1024);
export const gb = (value: number) => mb(value * 1024);
export const tb = (value: number) => gb(value * 1024);
