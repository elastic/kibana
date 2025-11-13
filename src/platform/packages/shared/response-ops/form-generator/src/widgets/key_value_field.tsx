/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import type { KeyValueWidgetProps } from './widget_props';

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

const generateId = () => uuidv4();

export const KeyValueField: React.FC<KeyValueWidgetProps> = ({
  fieldId,
  value,
  label,
  error,
  isInvalid,
  onChange,
  onBlur,
  widgetOptions,
  fullWidth = true,
  setFieldError,
  errors = {},
  helpText,
}) => {
  const [pairs, setPairs] = useState<KeyValuePair[]>(() => {
    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
      return Object.entries(value).map(([key, val]) => ({
        id: generateId(),
        key,
        value: String(val),
      }));
    }
    return [{ id: generateId(), key: '', value: '' }];
  });

  const [pairErrors, setPairErrors] = useState<Record<string, { key?: string; value?: string }>>(
    {}
  );

  const lastNotifiedValueRef = React.useRef<string>('');

  React.useEffect(() => {
    if (value && typeof value === 'object') {
      lastNotifiedValueRef.current = JSON.stringify(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateAndSetErrors = useCallback(
    (updatedPairs: KeyValuePair[]) => {
      const keysSeen = new Set<string>();
      const errorMessages: string[] = [];
      const pairErrorsMap: Record<string, { key?: string; value?: string }> = {};

      updatedPairs.forEach((pair) => {
        const trimmedKey = pair.key.trim();

        if (!trimmedKey && pair.value.trim()) {
          errorMessages.push('Key cannot be empty');
          pairErrorsMap[pair.id] = { key: 'Key cannot be empty' };
        } else if (trimmedKey) {
          if (keysSeen.has(trimmedKey)) {
            errorMessages.push(`Duplicate key: ${trimmedKey}`);
            pairErrorsMap[pair.id] = { key: 'Duplicate key' };
          } else {
            keysSeen.add(trimmedKey);
          }
        }
      });

      setPairErrors(pairErrorsMap);

      if (setFieldError) {
        if (errorMessages.length > 0) {
          setFieldError(fieldId, errorMessages);
        } else {
          setFieldError(fieldId, undefined);
        }
      }
    },
    [fieldId, setFieldError]
  );

  const notifyParent = useCallback(
    (updatedPairs: KeyValuePair[]) => {
      const nonEmptyPairs = updatedPairs.filter((pair) => pair.key.trim() || pair.value.trim());

      const recordValue = nonEmptyPairs.reduce((acc, pair) => {
        if (pair.key.trim()) {
          acc[pair.key] = pair.value;
        }
        return acc;
      }, {} as Record<string, string>);

      lastNotifiedValueRef.current = JSON.stringify(recordValue);

      onChange(fieldId, recordValue);

      validateAndSetErrors(updatedPairs);
    },
    [fieldId, onChange, validateAndSetErrors]
  );

  useEffect(() => {
    const currentValueStr = JSON.stringify(value || {});
    if (currentValueStr === lastNotifiedValueRef.current) {
      return;
    }

    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
      const newPairs = Object.entries(value).map(([key, val]) => ({
        id: generateId(),
        key,
        value: String(val),
      }));
      setPairs(newPairs);
      lastNotifiedValueRef.current = currentValueStr;
    } else if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
      setPairs([{ id: generateId(), key: '', value: '' }]);
      lastNotifiedValueRef.current = currentValueStr;
    }
  }, [value]);

  const handlePairChange = useCallback(
    (id: string, field: 'key' | 'value', newValue: string) => {
      const updatedPairs = pairs.map((pair) =>
        pair.id === id ? { ...pair, [field]: newValue } : pair
      );

      setPairs(updatedPairs);
      notifyParent(updatedPairs);
    },
    [pairs, notifyParent]
  );

  const handleAddPair = useCallback(() => {
    const newPair: KeyValuePair = { id: generateId(), key: '', value: '' };
    const updatedPairs = [...pairs, newPair];
    setPairs(updatedPairs);
  }, [pairs]);

  const handleRemovePair = useCallback(
    (id: string) => {
      if (pairs.length === 1) {
        const updatedPairs = [{ id: generateId(), key: '', value: '' }];
        setPairs(updatedPairs);
        setPairErrors({});
        notifyParent(updatedPairs);
      } else {
        const updatedPairs = pairs.filter((pair) => pair.id !== id);
        setPairs(updatedPairs);
        notifyParent(updatedPairs);
      }
    },
    [pairs, notifyParent]
  );

  const handleBlur = useCallback(() => {
    onBlur(fieldId, value);
  }, [fieldId, value, onBlur]);

  const hasAnyPairError = Object.keys(pairErrors).length > 0;
  const showError = isInvalid || hasAnyPairError;

  return (
    <EuiFormRow
      label={label}
      error={error}
      isInvalid={showError}
      fullWidth={fullWidth}
      helpText={widgetOptions?.helpText as string}
    >
      <div>
        {pairs.map((pair, index) => {
          const pairError = pairErrors[pair.id];
          const keyError = pairError?.key;
          const valueError = pairError?.value;

          return (
            <React.Fragment key={pair.id}>
              {index > 0 && <EuiSpacer size="s" />}
              <EuiFlexGroup gutterSize="s" alignItems="flexStart">
                <EuiFlexItem>
                  <EuiFormRow
                    isInvalid={!!keyError}
                    error={keyError}
                    fullWidth
                    display="rowCompressed"
                  >
                    <EuiFieldText
                      placeholder="Key"
                      value={pair.key}
                      onChange={(e) => handlePairChange(pair.id, 'key', e.target.value)}
                      onBlur={handleBlur}
                      isInvalid={!!keyError}
                      compressed
                      fullWidth
                      data-test-subj={`${fieldId}-key-${index}`}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    isInvalid={!!valueError}
                    error={valueError}
                    fullWidth
                    display="rowCompressed"
                  >
                    <EuiFieldText
                      placeholder="Value"
                      value={pair.value}
                      onChange={(e) => handlePairChange(pair.id, 'value', e.target.value)}
                      onBlur={handleBlur}
                      isInvalid={!!valueError}
                      compressed
                      fullWidth
                      data-test-subj={`${fieldId}-value-${index}`}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label="Remove key-value pair"
                    onClick={() => handleRemovePair(pair.id)}
                    data-test-subj={`${fieldId}-remove-${index}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </React.Fragment>
          );
        })}
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          iconType="plusInCircle"
          size="xs"
          onClick={handleAddPair}
          data-test-subj={`${fieldId}-add`}
        >
          Add pair
        </EuiButtonEmpty>
      </div>
    </EuiFormRow>
  );
};
