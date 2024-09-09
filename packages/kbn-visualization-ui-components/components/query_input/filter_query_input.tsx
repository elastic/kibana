/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIconTip,
  EuiPopoverProps,
} from '@elastic/eui';
import type { DataViewBase, Query } from '@kbn/es-query';
import { QueryInput, validateQuery } from '.';
import type { QueryInputServices } from '.';
import './filter_query_input.scss';

const filterByLabel = i18n.translate('visualizationUiComponents.filterQueryInput.label', {
  defaultMessage: 'Filter by',
});

// to do: get the language from uiSettings
export const defaultFilter: Query = {
  query: '',
  language: 'kuery',
};

export interface FilterQueryInputProps {
  inputFilter: Query | undefined;
  onChange: (query: Query) => void;
  dataView: DataViewBase;
  helpMessage?: string | null;
  label?: string;
  initiallyOpen?: boolean;
  ['data-test-subj']?: string;
  queryInputServices: QueryInputServices;
  appName: string;
}

export function FilterQueryInput({
  inputFilter,
  onChange,
  dataView,
  helpMessage,
  label = filterByLabel,
  initiallyOpen,
  ['data-test-subj']: dataTestSubj,
  queryInputServices,
  appName,
}: FilterQueryInputProps) {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(Boolean(initiallyOpen));

  const onClosePopup: EuiPopoverProps['closePopover'] = useCallback(() => {
    setFilterPopoverOpen(false);
  }, []);

  const { isValid: isInputFilterValid } = validateQuery(inputFilter, dataView);
  const { isValid: isQueryInputValid, error: queryInputError } = validateQuery(
    inputFilter,
    dataView
  );

  return (
    <EuiFormRow
      display="rowCompressed"
      label={
        helpMessage ? (
          <>
            {label}{' '}
            <EuiIconTip
              color="subdued"
              content={helpMessage}
              iconProps={{
                className: 'eui-alignTop',
              }}
              position="top"
              size="s"
              type="questionInCircle"
            />
          </>
        ) : (
          label
        )
      }
      fullWidth
      isInvalid={!isInputFilterValid}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiPopover
            isOpen={filterPopoverOpen}
            closePopover={onClosePopup}
            display="block"
            panelClassName="filterQueryInput__popover"
            initialFocus={dataTestSubj ? `textarea[data-test-subj='${dataTestSubj}']` : undefined}
            button={
              <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
                  <EuiFlexItem grow={true}>
                    <EuiLink
                      className="filterQueryInput__popoverButton"
                      data-test-subj="indexPattern-filters-existingFilterTrigger"
                      onClick={() => {
                        setFilterPopoverOpen(!filterPopoverOpen);
                      }}
                      color={isInputFilterValid ? 'text' : 'danger'}
                      title={i18n.translate(
                        'visualizationUiComponents.filterQueryInput.clickToEdit',
                        {
                          defaultMessage: 'Click to edit',
                        }
                      )}
                    >
                      {inputFilter?.query ||
                        i18n.translate(
                          'visualizationUiComponents.filterQueryInput.emptyFilterQuery',
                          {
                            defaultMessage: '(empty)',
                          }
                        )}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            }
          >
            <EuiFormRow
              label={label}
              isInvalid={!isQueryInputValid}
              error={queryInputError}
              fullWidth={true}
              data-test-subj="indexPattern-filter-by-input"
            >
              <QueryInput
                dataView={
                  dataView.id
                    ? { type: 'id', value: dataView.id }
                    : { type: 'title', value: dataView.title }
                }
                disableAutoFocus={true}
                value={inputFilter ?? defaultFilter}
                onChange={onChange}
                isInvalid={!isQueryInputValid}
                onSubmit={() => {}}
                data-test-subj={dataTestSubj}
                appName={appName}
                services={queryInputServices}
              />
            </EuiFormRow>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
