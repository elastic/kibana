/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DEVTOOL_LIVE_ATTR } from '../../../lib/constants';

const STATE_ATTR_PREFIX = 'data-state-';

/**
 * Context providing initial state values for library components rendered
 * via import. Keys are state attribute names (without the prefix),
 * values are the serialized string representation.
 */
export const SerializedStateContext = createContext<Record<string, string>>({});

/**
 * A drop-in replacement for `useState` that syncs the value to a
 * `data-state-{key}` attribute on the nearest `[data-devtool-live]`
 * ancestor element.
 *
 * On mount, reads the initial value from:
 * 1. The {@link SerializedStateContext} (set during import), or
 * 2. The provided `defaultValue`.
 *
 * On every state change, writes the value back to the data attribute
 * so it can be read during export.
 */
type Widen<T> = T extends boolean
  ? boolean
  : T extends number
  ? number
  : T extends string
  ? string
  : T;

export const useSerializableState = <T extends string | number | boolean>(
  key: string,
  defaultValue: T
): [Widen<T>, (v: Widen<T> | ((prev: Widen<T>) => Widen<T>)) => void] => {
  const initialState = useContext(SerializedStateContext);
  const elRef = useRef<HTMLElement | null>(null);

  const [value, setValue] = useState<Widen<T>>(() => {
    const serialized = initialState[key];
    if (serialized !== undefined) {
      return parseValue(serialized, defaultValue) as Widen<T>;
    }
    return defaultValue as Widen<T>;
  });

  useEffect(() => {
    if (!elRef.current) {
      elRef.current = findLiveWrapper();
    }
    if (elRef.current) {
      elRef.current.setAttribute(`${STATE_ATTR_PREFIX}${key}`, String(value));
    }
  }, [key, value]);

  return [value, setValue];
};

const findLiveWrapper = (): HTMLElement | null => {
  const all = document.querySelectorAll<HTMLElement>(`[${DEVTOOL_LIVE_ATTR}]`);
  return all.length > 0 ? all[all.length - 1] : null;
};

const parseValue = <T extends string | number | boolean>(raw: string, defaultValue: T): T => {
  if (typeof defaultValue === 'boolean') {
    return (raw === 'true') as T;
  }
  if (typeof defaultValue === 'number') {
    const n = Number(raw);
    return (Number.isNaN(n) ? defaultValue : n) as T;
  }
  return raw as T;
};

/**
 * Read all `data-state-*` attributes from an element and return them
 * as a plain key→value record.
 */
export const readStateAttributes = (el: HTMLElement): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith(STATE_ATTR_PREFIX)) {
      result[attr.name.slice(STATE_ATTR_PREFIX.length)] = attr.value;
    }
  }
  return result;
};
