"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const unitMultiplier = {
    b: Math.pow(1024, 0),
    gb: Math.pow(1024, 3),
    kb: Math.pow(1024, 1),
    mb: Math.pow(1024, 2),
};
function renderUnit(value, unit) {
    const prettyValue = Number(value.toFixed(2));
    return `${prettyValue}${unit}`;
}
class ByteSizeValue {
    constructor(valueInBytes) {
        this.valueInBytes = valueInBytes;
        if (!Number.isSafeInteger(valueInBytes) || valueInBytes < 0) {
            throw new Error(`Value in bytes is expected to be a safe positive integer, ` +
                `but provided [${valueInBytes}]`);
        }
    }
    static parse(text) {
        const match = /([1-9][0-9]*)(b|kb|mb|gb)/.exec(text);
        if (!match) {
            throw new Error(`could not parse byte size value [${text}]. Value must be a safe positive integer.`);
        }
        const value = parseInt(match[1], 0);
        const unit = match[2];
        return new ByteSizeValue(value * unitMultiplier[unit]);
    }
    isGreaterThan(other) {
        return this.valueInBytes > other.valueInBytes;
    }
    isLessThan(other) {
        return this.valueInBytes < other.valueInBytes;
    }
    isEqualTo(other) {
        return this.valueInBytes === other.valueInBytes;
    }
    getValueInBytes() {
        return this.valueInBytes;
    }
    toString(returnUnit) {
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
exports.ByteSizeValue = ByteSizeValue;
exports.bytes = (value) => new ByteSizeValue(value);
exports.kb = (value) => exports.bytes(value * 1024);
exports.mb = (value) => exports.kb(value * 1024);
exports.gb = (value) => exports.mb(value * 1024);
exports.tb = (value) => exports.gb(value * 1024);
function ensureByteSizeValue(value) {
    if (typeof value === 'string') {
        return ByteSizeValue.parse(value);
    }
    if (typeof value === 'number') {
        return new ByteSizeValue(value);
    }
    return value;
}
exports.ensureByteSizeValue = ensureByteSizeValue;
