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

import { EuiContextMenu, EuiPopover } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import classNames from 'classnames';
import React, { MouseEvent, useState, useEffect } from 'react';
import { IUiSettingsClient } from 'src/core/public';
import { FilterEditor } from './filter_editor';
import { FilterView } from './filter_view';
import { IIndexPattern } from '../..';
import {
  Filter,
  isFilterPinned,
  getDisplayValueFromFilter,
  toggleFilterNegated,
  toggleFilterPinned,
  toggleFilterDisabled,
  getIndexPatternFromFilter,
} from '../../../common';
import { getIndexPatterns } from '../../services';

interface Props {
  id: string;
  filter: Filter;
  indexPatterns: IIndexPattern[];
  className?: string;
  onUpdate: (filter: Filter) => void;
  onRemove: () => void;
  intl: InjectedIntl;
  uiSettings: IUiSettingsClient;
}

interface LabelOptions {
  title: string;
  status: string;
  message?: string;
}

const FILTER_ITEM_OK = '';
const FILTER_ITEM_WARNING = 'warn';
const FILTER_ITEM_ERROR = 'error';

export function FilterItem(props: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [indexPatternExists, setIndexPatternExists] = useState<boolean | undefined>(undefined);
  const { id, filter, indexPatterns } = props;

  useEffect(() => {
    const index = props.filter.meta.index;
    if (index) {
      getIndexPatterns()
        .get(index)
        .then((indexPattern) => {
          setIndexPatternExists(!!indexPattern);
        })
        .catch(() => {
          setIndexPatternExists(false);
        });
    } else {
      // Allow filters without an index pattern and don't validate them.
      setIndexPatternExists(true);
    }
  }, [props.filter.meta.index]);

  function handleBadgeClick(e: MouseEvent<HTMLInputElement>) {
    if (e.shiftKey) {
      onToggleDisabled();
    } else {
      setIsPopoverOpen(!isPopoverOpen);
    }
  }

  function onSubmit(f: Filter) {
    setIsPopoverOpen(false);
    props.onUpdate(f);
  }

  function onTogglePinned() {
    const f = toggleFilterPinned(filter);
    props.onUpdate(f);
  }

  function onToggleNegated() {
    const f = toggleFilterNegated(filter);
    props.onUpdate(f);
  }

  function onToggleDisabled() {
    const f = toggleFilterDisabled(filter);
    props.onUpdate(f);
  }

  function isValidLabel(labelConfig: LabelOptions) {
    return labelConfig.status === FILTER_ITEM_OK;
  }

  function isDisabled(labelConfig: LabelOptions) {
    const { disabled } = filter.meta;
    return disabled || labelConfig.status === FILTER_ITEM_ERROR;
  }

  function getClasses(negate: boolean, labelConfig: LabelOptions) {
    return classNames(
      'globalFilterItem',
      {
        'globalFilterItem-isDisabled': isDisabled(labelConfig),
        'globalFilterItem-isError': labelConfig.status === FILTER_ITEM_ERROR,
        'globalFilterItem-isWarning': labelConfig.status === FILTER_ITEM_WARNING,
        'globalFilterItem-isPinned': isFilterPinned(filter),
        'globalFilterItem-isExcluded': negate,
      },
      props.className
    );
  }

  function getDataTestSubj(labelConfig: LabelOptions) {
    const dataTestSubjKey = filter.meta.key ? `filter-key-${filter.meta.key}` : '';
    const dataTestSubjValue = filter.meta.value
      ? `filter-value-${isValidLabel(labelConfig) ? labelConfig.title : labelConfig.status}`
      : '';
    const dataTestSubjNegated = filter.meta.negate ? 'filter-negated' : '';
    const dataTestSubjDisabled = `filter-${isDisabled(labelConfig) ? 'disabled' : 'enabled'}`;
    const dataTestSubjPinned = `filter-${isFilterPinned(filter) ? 'pinned' : 'unpinned'}`;
    return `filter ${dataTestSubjDisabled} ${dataTestSubjKey} ${dataTestSubjValue} ${dataTestSubjPinned} ${dataTestSubjNegated}`;
  }

  function getPanels() {
    const { negate, disabled } = filter.meta;
    return [
      {
        id: 0,
        items: [
          {
            name: isFilterPinned(filter)
              ? props.intl.formatMessage({
                  id: 'data.filter.filterBar.unpinFilterButtonLabel',
                  defaultMessage: 'Unpin',
                })
              : props.intl.formatMessage({
                  id: 'data.filter.filterBar.pinFilterButtonLabel',
                  defaultMessage: 'Pin across all apps',
                }),
            icon: 'pin',
            onClick: () => {
              setIsPopoverOpen(false);
              onTogglePinned();
            },
            'data-test-subj': 'pinFilter',
          },
          {
            name: props.intl.formatMessage({
              id: 'data.filter.filterBar.editFilterButtonLabel',
              defaultMessage: 'Edit filter',
            }),
            icon: 'pencil',
            panel: 1,
            'data-test-subj': 'editFilter',
          },
          {
            name: negate
              ? props.intl.formatMessage({
                  id: 'data.filter.filterBar.includeFilterButtonLabel',
                  defaultMessage: 'Include results',
                })
              : props.intl.formatMessage({
                  id: 'data.filter.filterBar.excludeFilterButtonLabel',
                  defaultMessage: 'Exclude results',
                }),
            icon: negate ? 'plusInCircle' : 'minusInCircle',
            onClick: () => {
              setIsPopoverOpen(false);
              onToggleNegated();
            },
            'data-test-subj': 'negateFilter',
          },
          {
            name: disabled
              ? props.intl.formatMessage({
                  id: 'data.filter.filterBar.enableFilterButtonLabel',
                  defaultMessage: 'Re-enable',
                })
              : props.intl.formatMessage({
                  id: 'data.filter.filterBar.disableFilterButtonLabel',
                  defaultMessage: 'Temporarily disable',
                }),
            icon: `${disabled ? 'eye' : 'eyeClosed'}`,
            onClick: () => {
              setIsPopoverOpen(false);
              onToggleDisabled();
            },
            'data-test-subj': 'disableFilter',
          },
          {
            name: props.intl.formatMessage({
              id: 'data.filter.filterBar.deleteFilterButtonLabel',
              defaultMessage: 'Delete',
            }),
            icon: 'trash',
            onClick: () => {
              setIsPopoverOpen(false);
              props.onRemove();
            },
            'data-test-subj': 'deleteFilter',
          },
        ],
      },
      {
        id: 1,
        width: 420,
        content: (
          <div>
            <FilterEditor
              filter={filter}
              indexPatterns={indexPatterns}
              onSubmit={onSubmit}
              onCancel={() => {
                setIsPopoverOpen(false);
              }}
            />
          </div>
        ),
      },
    ];
  }

  /**
   * Checks if filter field exists in any of the index patterns provided,
   * Because if so, a filter for the wrong index pattern may still be applied.
   * This function makes this behavior explicit, but it needs to be revised.
   */
  function isFilterApplicable() {
    // Any filter is applicable if no index patterns were provided to FilterBar.
    if (!props.indexPatterns.length) return true;

    const ip = getIndexPatternFromFilter(filter, indexPatterns);
    if (ip) return true;

    const allFields = indexPatterns.map((indexPattern) => {
      return indexPattern.fields.map((field) => field.name);
    });
    const flatFields = allFields.reduce((acc: string[], it: string[]) => [...acc, ...it], []);
    return flatFields.includes(filter.meta?.key || '');
  }

  function getValueLabel(): LabelOptions {
    const label = {
      title: '',
      message: '',
      status: FILTER_ITEM_OK,
    };
    if (indexPatternExists === false) {
      label.status = FILTER_ITEM_ERROR;
      label.title = props.intl.formatMessage({
        id: 'data.filter.filterBar.labelErrorText',
        defaultMessage: `Error`,
      });
      label.message = props.intl.formatMessage(
        {
          id: 'data.filter.filterBar.labelErrorInfo',
          defaultMessage: 'Index pattern {indexPattern} not found',
        },
        {
          indexPattern: filter.meta.index,
        }
      );
    } else if (isFilterApplicable()) {
      try {
        label.title = getDisplayValueFromFilter(filter, indexPatterns);
      } catch (e) {
        label.status = FILTER_ITEM_ERROR;
        label.title = props.intl.formatMessage({
          id: 'data.filter.filterBar.labelErrorText',
          defaultMessage: `Error`,
        });
        label.message = e.message;
      }
    } else {
      label.status = FILTER_ITEM_WARNING;
      label.title = props.intl.formatMessage({
        id: 'data.filter.filterBar.labelWarningText',
        defaultMessage: `Warning`,
      });
      label.message = props.intl.formatMessage(
        {
          id: 'data.filter.filterBar.labelWarningInfo',
          defaultMessage: 'Field {fieldName} does not exist in current view',
        },
        {
          fieldName: filter.meta.key,
        }
      );
    }

    return label;
  }

  // Don't render until we know if the index pattern is valid
  if (indexPatternExists === undefined) return null;
  const valueLabelConfig = getValueLabel();

  // Disable errored filters and re-render
  if (valueLabelConfig.status === FILTER_ITEM_ERROR && !filter.meta.disabled) {
    filter.meta.disabled = true;
    props.onUpdate(filter);
    return null;
  }

  const badge = (
    <FilterView
      filter={filter}
      valueLabel={valueLabelConfig.title}
      errorMessage={valueLabelConfig.message}
      className={getClasses(filter.meta.negate, valueLabelConfig)}
      iconOnClick={() => props.onRemove()}
      onClick={handleBadgeClick}
      data-test-subj={getDataTestSubj(valueLabelConfig)}
    />
  );

  return (
    <EuiPopover
      id={`popoverFor_filter${id}`}
      className={`globalFilterItem__popover`}
      anchorClassName={`globalFilterItem__popoverAnchor`}
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
      button={badge}
      anchorPosition="downLeft"
      withTitle={true}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={getPanels()} />
    </EuiPopover>
  );
}
