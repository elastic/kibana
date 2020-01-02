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

import { i18n } from '@kbn/i18n';

export function getPainlessError(error: Error) {
  const errorBody = (error as any).body;
  if (!errorBody || errorBody.statusCode !== 400) {
    return;
  }

  // The response from the new endpoint does not contain a rootCause.
  // What would be the proper way to handle this?
  if (!errorBody.message.startsWith('[script_exception]')) {
    return;
  }

  const lang = 'painless';
  const script = '';

  return {
    lang,
    script,
    message: i18n.translate('kbn.discover.painlessError.painlessScriptedFieldErrorMessage', {
      defaultMessage: "Error with Painless scripted field '{script}'.",
      values: { script },
    }),
    error: error.message,
  };
}
