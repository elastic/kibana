/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { isJSON } from '../../../static/validators/string';

export interface JsonEditorState<T = { [key: string]: any }> {
  data: {
    raw: string;
    format(): T;
  };
  validate(): boolean;
  isValid: boolean | undefined;
}

export type OnJsonEditorUpdateHandler<T = { [key: string]: any }> = (
  arg: JsonEditorState<T>
) => void;

interface Parameters<T extends object> {
  onUpdate: OnJsonEditorUpdateHandler<T>;
  defaultValue?: T;
  value?: string;
}

const stringifyJson = (json: { [key: string]: any }) =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

export const useJson = <T extends object = { [key: string]: any }>({
  defaultValue = {} as T,
  onUpdate,
  value,
}: Parameters<T>) => {
  const isControlled = value !== undefined;
  const isMounted = useRef(false);
  const [content, setContent] = useState<string>(
    isControlled ? value! : stringifyJson(defaultValue)
  );
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(() => {
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
  }, [content]);

  const formatContent = useCallback(() => {
    const isValid = validate();
    const data = isValid && content.trim() !== '' ? JSON.parse(content) : {};
    return data as T;
  }, [validate, content]);

  useEffect(() => {
    if (!isMounted.current || isControlled) {
      return;
    }

    const isValid = validate();

    onUpdate({
      data: {
        raw: content,
        format: formatContent,
      },
      validate,
      isValid,
    });
  }, [onUpdate, content, formatContent, validate, isControlled]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    content,
    setContent,
    error,
    isControlled,
  };
};
