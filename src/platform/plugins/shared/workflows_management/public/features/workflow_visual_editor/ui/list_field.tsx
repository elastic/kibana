/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { fromTags, toTags } from '../lib/list_value';
import { findReferenceTokens } from '../lib/reference_tokens';

/**
 * A tag that is exactly one reference is drawn like a chip elsewhere: the type icon, then the
 * expression without its braces, with how it is written on hover. The tag itself stays the raw
 * text; it is the option's `key`, because `{{ x }}` and `${{ x }}` read the same but differ.
 * Anything else is just its text.
 *
 * The hover note is the pill's native `title`: a combo box pill ignores `toolTipContent` (that is
 * for the rows of the dropdown list), and `title` also keeps the full expression readable when
 * the pill truncates it.
 */
const toOption = (tag: string, catalog: DataReferenceCatalog): EuiComboBoxOptionOption => {
  const [token] = findReferenceTokens(tag, { catalog });
  if (!token?.isWhole) return { label: tag };
  return {
    label: token.expression,
    key: tag,
    prepend: (
      <span aria-hidden css={{ display: 'inline-flex', flex: '0 0 auto' }}>
        <FieldIcon type={token.iconType} color="gray" size="s" shape="square" />
      </span>
    ),
    title: `${token.expression}\n${token.hover}`,
  };
};

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
  catalog,
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
  /** Gives a reference tag its type. */
  readonly catalog: DataReferenceCatalog;
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
      selectedOptions={tags.map((tag) => toOption(tag, catalog))}
      onChange={(selected) => commit(selected.map((option) => option.key ?? option.label))}
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
