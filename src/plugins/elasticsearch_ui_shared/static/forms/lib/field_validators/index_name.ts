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

// Note: we can't import from "ui/indices" as the TS Type definition don't exist
// import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';
import { ValidationFunc } from '../../hook_form_lib';
import { startsWith, containsChars } from '../../../validators/string';
import { formatError } from '../../errors';

const INDEX_ILLEGAL_CHARACTERS = ['\\', '/', '?', '"', '<', '>', '|', '*'];

export const indexNameField = (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc> => {
  const [{ value }] = args;

  if (startsWith('.')(value as string)) {
    return formatError('INDEX_NAME', 'Cannot start with a dot (".").');
  }

  const { doesContain: doesContainSpaces } = containsChars(' ')(value as string);
  if (doesContainSpaces) {
    return formatError('INDEX_NAME', 'Cannot contain spaces.');
  }

  const { charsFound, doesContain } = containsChars(INDEX_ILLEGAL_CHARACTERS)(value as string);
  if (doesContain) {
    return formatError(
      'INDEX_NAME',
      `Cannot contain the following characters: "${charsFound.join(',')}."`
    );
  }
};
