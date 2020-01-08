/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
  public static parse(text: string): ByteSizeValue {
    const match = /([1-9][0-9]*)(b|kb|mb|gb)/.exec(text);
    if (!match) {
      const number = Number(text);
      if (typeof number !== 'number' || isNaN(number)) {
        throw new Error(
          `Failed to parse [${text}] as byte value. Value must be either number of bytes, or follow the format <count>[b|kb|mb|gb] ` +
            `(e.g., '1024kb', '200mb', '1gb'), where the number is a safe positive integer.`
        );
      }
      return new ByteSizeValue(number);
    }

    const value = parseInt(match[1], 0);
    const unit = match[2];

    return new ByteSizeValue(value * unitMultiplier[unit]);
  }

  constructor(private readonly valueInBytes: number) {
    if (!Number.isSafeInteger(valueInBytes) || valueInBytes < 0) {
      throw new Error(
        `Value in bytes is expected to be a safe positive integer, but provided [${valueInBytes}].`
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
}

export const bytes = (value: number) => new ByteSizeValue(value);
export const kb = (value: number) => bytes(value * 1024);
export const mb = (value: number) => kb(value * 1024);
export const gb = (value: number) => mb(value * 1024);
export const tb = (value: number) => gb(value * 1024);

export function ensureByteSizeValue(value?: ByteSizeValue | string | number) {
  if (typeof value === 'string') {
    return ByteSizeValue.parse(value);
  }

  if (typeof value === 'number') {
    return new ByteSizeValue(value);
  }

  return value;
}
