/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBox } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { fromTags, toTags } from '../lib/list_value';

/**
 * One value or a few, as tags. Typing one value keeps it a plain value (when the schema allows
 * that); a second turns it into a list, and removing back to one collapses it again. Fields with
 * fixed choices offer only those; the rest take any text.
 */
export function ListField({
  value,
  onChange,
  options,
  acceptsSingle,
  ariaLabel,
  isInvalid,
  onBlur,
  'data-test-subj': dataTestSubj,
}: {
  readonly value: unknown;
  readonly onChange: (next: string | string[]) => void;
  /** Allowed values, for enum lists; omit for free text. */
  readonly options?: readonly string[];
  readonly acceptsSingle: boolean;
  readonly ariaLabel: string;
  readonly isInvalid: boolean;
  readonly onBlur: () => void;
  readonly 'data-test-subj': string;
}) {
  const tags = toTags(value);
  const commit = (next: readonly string[]) => onChange(fromTags(next, acceptsSingle));

  return (
    <EuiComboBox
      aria-label={ariaLabel}
      compressed
      fullWidth
      isClearable
      isInvalid={isInvalid}
      noSuggestions={!options}
      placeholder={
        options
          ? undefined
          : i18n.translate('workflows.stepConfigPanel.list.placeholder', {
              defaultMessage: 'Type a value and press Enter',
            })
      }
      options={options?.map((label) => ({ label }))}
      selectedOptions={tags.map((label) => ({ label }))}
      onChange={(selected) => commit(selected.map((option) => option.label))}
      onCreateOption={
        options
          ? undefined
          : (text) => {
              const tag = text.trim();
              if (tag !== '' && !tags.includes(tag)) commit([...tags, tag]);
            }
      }
      onBlur={onBlur}
      data-test-subj={dataTestSubj}
    />
  );
}
