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

import { isRangeValid } from './is_range_valid';

const formatMessageMock = () => {
  return '';
};

it('Should return true when lower and upper values are set and between min and max', () => {
  const { isValid } = isRangeValid([1, 2], 0, 10, formatMessageMock);
  expect(isValid).toBe(true);
});

it('Should return true when lower and upper values are not set (empty range)', () => {
  const { isValid } = isRangeValid(['', ''], 0, 10, formatMessageMock);
  expect(isValid).toBe(true);
});

it('Should return false when lower value is not set and upper value is set', () => {
  const { isValid,  } = isRangeValid(['', 2], 0, 10, formatMessageMock);
  expect(isValid).toBe(false);
});

it('Should return false when lower value is set and upper value is not set', () => {
  const { isValid,  } = isRangeValid([1, ''], 0, 10, formatMessageMock);
  expect(isValid).toBe(false);
});

it('Should return false when lower value is greater than upper value', () => {
  const { isValid,  } = isRangeValid([2, 1], 0, 10, formatMessageMock);
  expect(isValid).toBe(false);
});

it('Should return false when lower value is less than min', () => {
  const { isValid,  } = isRangeValid([-1, 2], 0, 10, formatMessageMock);
  expect(isValid).toBe(false);
});

it('Should return false when upper value is greater than max', () => {
  const { isValid,  } = isRangeValid([1, 11], 0, 10, formatMessageMock);
  expect(isValid).toBe(false);
});
