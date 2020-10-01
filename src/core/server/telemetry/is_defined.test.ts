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

// describe.skip('isConfigured', () => {
//   it('returns true for a string', () => {
//     expect(isConfigured('hello')).toEqual(true);
//     expect(isConfigured('')).toEqual(true);
//     expect(isConfigured(' ')).toEqual(true);
//   });

//   it('returns true for a number', () => {
//     expect(isConfigured(1)).toEqual(true);
//     expect(isConfigured(-1)).toEqual(true);
//     expect(isConfigured(0)).toEqual(true);
//     expect(isConfigured(-0)).toEqual(true);
//     expect(isConfigured(Number.NaN)).toEqual(true);
//   });

//   it('returns true for an array', () => {
//     expect(isConfigured(['hello'])).toEqual(true);
//     expect(isConfigured([])).toEqual(true);
//     expect(isConfigured([{ key: 'hello' }])).toEqual(true);
//     expect(isConfigured([{}])).toEqual(true);
//   });

//   it('returns true for a record', () => {
//     expect(isConfigured({})).toEqual(true);
//     expect(isConfigured({ key: 'hello' })).toEqual(true);
//   });

//   it('returns true for a boolean', () => {
//     expect(isConfigured(true)).toEqual(true);
//     expect(isConfigured(false)).toEqual(true);
//   });

//   it('returns false for undefined', () => {
//     expect(isConfigured(undefined)).toEqual(false);
//   });

//   it('returns false for null', () => {
//     expect(isConfigured(null)).toEqual(false);
//   });
// });
