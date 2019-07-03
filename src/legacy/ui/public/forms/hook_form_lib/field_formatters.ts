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

/*
 **
 * Field formatters are function that are executed each time the field value is set
 * We can specify as many formatters per field.
 *
 * Example
 * ```ts
 * const toUppercase = (value: string) => value.toUppercase();
 * const replaceChar = (regEx: RegExp, newValue: string) => (value: string) => value.replace(regEx, newValue);
 *
 * const fieldConfig = {
 *   formatters: [toUppercase, replaceChar(/A/g, '*')];
 * };
 *
 * // Whenever the field value is set, it will be formatted with the above
 * // 'abc' => '*BC';
 * ````
 */

/**
 * NOTE: The toInt() formatter does _not_ play well if we enter the "e" letter in a "number" input
 * as it does not trigger an "onChange" event.
 * I searched if it was a bug and found this thread (https://github.com/facebook/react/pull/7359#event-1017024857)
 * We will need to investigate this a little further.
 *
 * @param value The string value to convert to number
 */
export const toInt = (value: string): number => parseFloat(value);
