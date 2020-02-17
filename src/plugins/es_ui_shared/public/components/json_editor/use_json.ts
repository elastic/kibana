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

import { useEffect, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { isJSON } from '../../../static/validators/string';

export type OnJsonEditorUpdateHandler<T = { [key: string]: any }> = (arg: {
  data: {
    raw: string;
    format(): T;
  };
  validate(): boolean;
  isValid: boolean | undefined;
}) => void;

interface Parameters<T extends object> {
  onUpdate: OnJsonEditorUpdateHandler<T>;
  defaultValue?: T;
  isControlled?: boolean;
}

const stringifyJson = (json: { [key: string]: any }) =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

export const useJson = <T extends object = { [key: string]: any }>({
  defaultValue = {} as T,
  onUpdate,
  isControlled = false,
}: Parameters<T>) => {
  const didMount = useRef(false);
  const [content, setContent] = useState<string>(stringifyJson(defaultValue));
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    // We allow empty string as it will be converted to "{}""
    const isValid = content.trim() === '' ? true : isJSON(content);
    if (!isValid) {
      setError(
        i18n.translate('esUi.validation.string.invalidJSONError', {
          defaultMessage: 'Invalid JSON',
        })
      );
    } else {
      setError(null);
    }
    return isValid;
  };

  const formatContent = () => {
    const isValid = validate();
    const data = isValid && content.trim() !== '' ? JSON.parse(content) : {};
    return data as T;
  };

  useEffect(() => {
    if (didMount.current) {
      const isValid = isControlled ? undefined : validate();
      onUpdate({
        data: {
          raw: content,
          format: formatContent,
        },
        validate,
        isValid,
      });
    } else {
      didMount.current = true;
    }
  }, [content]);

  return {
    content,
    setContent,
    error,
  };
};
