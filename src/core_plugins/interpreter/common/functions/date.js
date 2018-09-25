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

import moment from 'moment';

const getInputDate = input => {
  // return current date if no input
  if (!input) return new Date();

  // return the input
  return input;
};

export const date = () => ({
  name: 'date',
  type: 'number',
  context: {
    types: ['null'],
  },
  help: 'Returns the current time, or a time parsed from a string, as milliseconds since epoch.',
  args: {
    value: {
      aliases: ['_'],
      types: ['string', 'null'],
      help:
        'An optional date string to parse into milliseconds since epoch. ' +
        'Can be either a valid Javascript Date input or a string to parse using the format argument. ' +
        'Must be an ISO 8601 string or you must provide the format.',
    },
    format: {
      types: ['string'],
      help:
        'The momentJS format for parsing the optional date string (See https://momentjs.com/docs/#/displaying/).',
    },
  },
  fn: (context, args) => {
    const { value: date, format } = args;
    const useMoment = date && format;
    const outputDate = useMoment ? moment.utc(date, format).toDate() : new Date(getInputDate(date));

    if (isNaN(outputDate.getTime())) throw new Error(`Invalid date input: ${date}`);

    return outputDate.valueOf();
  },
});
