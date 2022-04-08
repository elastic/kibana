/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiForm, EuiButtonIcon, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { IAggConfig, Query, DataPublicPluginStart } from '../../../../data/public';
import { QueryStringInput } from '../../../../unified_search/public';

import { useKibana } from '../../../../kibana_react/public';

interface FilterRowProps {
  id: string;
  arrayIndex: number;
  customLabel: string;
  value: Query;
  autoFocus: boolean;
  disableRemove: boolean;
  dataTestSubj: string;
  onChangeValue(id: string, query: Query, label: string): void;
  onRemoveFilter(id: string): void;
  agg: IAggConfig;
}

function FilterRow({
  id,
  arrayIndex,
  customLabel,
  value,
  autoFocus,
  disableRemove,
  dataTestSubj,
  agg,
  onChangeValue,
  onRemoveFilter,
}: FilterRowProps) {
  const { services } = useKibana<{ data: DataPublicPluginStart; appName: string }>();
  const [showCustomLabel, setShowCustomLabel] = useState(false);
  const filterLabel = i18n.translate('visDefaultEditor.controls.filters.filterLabel', {
    defaultMessage: 'Filter {index}',
    values: {
      index: arrayIndex + 1,
    },
  });

  const onBlur = () => {
    if (value.query.length > 0) {
      // Store filter to the query log so that it is available in autocomplete.
      services.data.query.addToQueryLog(services.appName, value);
    }
  };

  const FilterControl = (
    <div>
      <EuiButtonIcon
        iconType="tag"
        aria-label={i18n.translate(
          'visDefaultEditor.controls.filters.toggleFilterButtonAriaLabel',
          {
            defaultMessage: 'Toggle filter label',
          }
        )}
        aria-expanded={showCustomLabel}
        aria-controls={`visEditorFilterLabel${arrayIndex}`}
        onClick={() => setShowCustomLabel(!showCustomLabel)}
      />
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        disabled={disableRemove}
        aria-label={i18n.translate(
          'visDefaultEditor.controls.filters.removeFilterButtonAriaLabel',
          {
            defaultMessage: 'Remove this filter',
          }
        )}
        onClick={() => onRemoveFilter(id)}
      />
    </div>
  );

  return (
    <EuiForm>
      <EuiFormRow
        label={`${filterLabel}${customLabel ? ` - ${customLabel}` : ''}`}
        labelAppend={FilterControl}
        fullWidth={true}
      >
        <QueryStringInput
          query={value}
          indexPatterns={[agg.getIndexPattern()]}
          onChange={(query: Query) => onChangeValue(id, query, customLabel)}
          onBlur={onBlur}
          disableAutoFocus={!autoFocus}
          dataTestSubj={dataTestSubj}
          bubbleSubmitEvent={true}
          languageSwitcherPopoverAnchorPosition="leftDown"
          size="s"
        />
      </EuiFormRow>
      {showCustomLabel ? (
        <EuiFormRow
          id={`visEditorFilterLabel${arrayIndex}`}
          label={i18n.translate('visDefaultEditor.controls.filters.definiteFilterLabel', {
            defaultMessage: 'Filter {index} label',
            description:
              "'Filter {index}' represents the name of the filter as a noun, similar to 'label for filter 1'.",
            values: {
              index: arrayIndex + 1,
            },
          })}
          fullWidth={true}
          display="rowCompressed"
        >
          <EuiFieldText
            value={customLabel}
            placeholder={i18n.translate('visDefaultEditor.controls.filters.labelPlaceholder', {
              defaultMessage: 'Label',
            })}
            onChange={(ev) => onChangeValue(id, value, ev.target.value)}
            fullWidth={true}
            compressed
          />
        </EuiFormRow>
      ) : null}
      <EuiSpacer size="m" />
    </EuiForm>
  );
}

export { FilterRow };
