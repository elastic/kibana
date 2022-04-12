/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiContextMenu, EuiPopover, EuiPopoverProps } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n-react';
import {
  Filter,
  isFilterPinned,
  toggleFilterNegated,
  toggleFilterPinned,
  toggleFilterDisabled,
} from '@kbn/es-query';
import classNames from 'classnames';
import React, { MouseEvent, useState, useEffect, HTMLAttributes } from 'react';
import { IUiSettingsClient } from 'src/core/public';
import { FilterEditor } from './filter_editor';
import { FilterView } from './filter_view';
import { DataView } from '../../../data_views/public';
import {
  getIndexPatternFromFilter as getDataViewFromFilter,
  getDisplayValueFromFilter,
} from '../../../data/public';
import { getDataViews } from '../services';

type PanelOptions = 'pinFilter' | 'editFilter' | 'negateFilter' | 'disableFilter' | 'deleteFilter';

export interface FilterItemProps {
  id: string;
  filter: Filter;
  dataViews: DataView[];
  className?: string;
  onUpdate: (filter: Filter) => void;
  onRemove: () => void;
  intl: InjectedIntl;
  uiSettings: IUiSettingsClient;
  hiddenPanelOptions?: PanelOptions[];
  timeRangeForSuggestionsOverride?: boolean;
  readonly?: boolean;
}

type FilterPopoverProps = HTMLAttributes<HTMLDivElement> & EuiPopoverProps;

interface LabelOptions {
  title: string;
  status: FilterLabelStatus;
  message?: string;
}

const FILTER_ITEM_OK = '';
const FILTER_ITEM_WARNING = 'warn';
const FILTER_ITEM_ERROR = 'error';

export type FilterLabelStatus =
  | typeof FILTER_ITEM_OK
  | typeof FILTER_ITEM_WARNING
  | typeof FILTER_ITEM_ERROR;

export const FILTER_EDITOR_WIDTH = 800;

export function FilterItem(props: FilterItemProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [dataViewExists, setDataViewExists] = useState<boolean | undefined>(undefined);
  const { id, filter, dataViews, hiddenPanelOptions } = props;

  useEffect(() => {
    const index = props.filter.meta.index;
    let isSubscribed = true;
    if (index) {
      getDataViews()
        .get(index)
        .then((dataView) => {
          if (isSubscribed) {
            setDataViewExists(!!dataView);
          }
        })
        .catch(() => {
          if (isSubscribed) {
            setDataViewExists(false);
          }
        });
    } else if (isSubscribed) {
      // Allow filters without an data view and don't validate them.
      setDataViewExists(true);
    }
    return () => {
      isSubscribed = false;
    };
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
    return classNames(
      'filter',
      dataTestSubjDisabled,
      dataTestSubjKey,
      dataTestSubjValue,
      dataTestSubjPinned,
      dataTestSubjNegated
    );
  }

  function getPanels() {
    const { negate, disabled } = filter.meta;
    let mainPanelItems = [
      {
        name: isFilterPinned(filter)
          ? props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterBar.unpinFilterButtonLabel',
              defaultMessage: 'Unpin',
            })
          : props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterBar.pinFilterButtonLabel',
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
          id: 'unifiedSearch.filter.filterBar.editFilterButtonLabel',
          defaultMessage: 'Edit filter',
        }),
        icon: 'pencil',
        panel: 1,
        'data-test-subj': 'editFilter',
      },
      {
        name: negate
          ? props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterBar.includeFilterButtonLabel',
              defaultMessage: 'Include results',
            })
          : props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterBar.excludeFilterButtonLabel',
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
              id: 'unifiedSearch.filter.filterBar.enableFilterButtonLabel',
              defaultMessage: 'Re-enable',
            })
          : props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterBar.disableFilterButtonLabel',
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
          id: 'unifiedSearch.filter.filterBar.deleteFilterButtonLabel',
          defaultMessage: 'Delete',
        }),
        icon: 'trash',
        onClick: () => {
          setIsPopoverOpen(false);
          props.onRemove();
        },
        'data-test-subj': 'deleteFilter',
      },
    ];

    if (hiddenPanelOptions && hiddenPanelOptions.length > 0) {
      mainPanelItems = mainPanelItems.filter(
        (pItem) => !hiddenPanelOptions.includes(pItem['data-test-subj'] as PanelOptions)
      );
    }
    return [
      {
        id: 0,
        items: mainPanelItems,
      },
      {
        id: 1,
        width: FILTER_EDITOR_WIDTH,
        content: (
          <div>
            <FilterEditor
              filter={filter}
              dataViews={dataViews}
              onSubmit={onSubmit}
              onCancel={() => {
                setIsPopoverOpen(false);
              }}
              timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
            />
          </div>
        ),
      },
    ];
  }

  /**
   * Checks if filter field exists in any of the data views provided,
   * Because if so, a filter for the wrong data view may still be applied.
   * This function makes this behavior explicit, but it needs to be revised.
   */
  function isFilterApplicable() {
    // Any filter is applicable if no data views were provided to FilterBar.
    if (!props.dataViews.length) return true;

    const ip = getDataViewFromFilter(filter, dataViews);
    if (ip) return true;

    const allFields = dataViews.map((dataView) => {
      return dataView.fields.map((field) => field.name);
    });
    const flatFields = allFields.reduce((acc: string[], it: string[]) => [...acc, ...it], []);
    return flatFields.includes(filter.meta?.key || '');
  }

  function getValueLabel(): LabelOptions {
    const label: LabelOptions = {
      title: '',
      message: '',
      status: FILTER_ITEM_OK,
    };

    if (filter.meta?.isMultiIndex) {
      return label;
    }

    if (dataViewExists === false) {
      label.status = FILTER_ITEM_ERROR;
      label.title = props.intl.formatMessage({
        id: 'unifiedSearch.filter.filterBar.labelErrorText',
        defaultMessage: `Error`,
      });
      label.message = props.intl.formatMessage(
        {
          id: 'unifiedSearch.filter.filterBar.labelErrorInfo',
          defaultMessage: 'Data view {dataView} not found',
        },
        {
          dataView: filter.meta.index,
        }
      );
    } else if (isFilterApplicable()) {
      try {
        label.title = getDisplayValueFromFilter(filter, dataViews);
      } catch (e) {
        label.status = FILTER_ITEM_ERROR;
        label.title = props.intl.formatMessage({
          id: 'unifiedSearch.filter.filterBar.labelErrorText',
          defaultMessage: `Error`,
        });
        label.message = e.message;
      }
    } else {
      label.status = FILTER_ITEM_WARNING;
      label.title = props.intl.formatMessage({
        id: 'unifiedSearch.filter.filterBar.labelWarningText',
        defaultMessage: `Warning`,
      });
      label.message = props.intl.formatMessage(
        {
          id: 'unifiedSearch.filter.filterBar.labelWarningInfo',
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
  if (dataViewExists === undefined) return null;
  const valueLabelConfig = getValueLabel();

  // Disable errored filters and re-render
  if (valueLabelConfig.status === FILTER_ITEM_ERROR && !filter.meta.disabled) {
    filter.meta.disabled = true;
    props.onUpdate(filter);
    return null;
  }

  const filterViewProps = {
    filter,
    valueLabel: valueLabelConfig.title,
    filterLabelStatus: valueLabelConfig.status,
    errorMessage: valueLabelConfig.message,
    className: getClasses(!!filter.meta.negate, valueLabelConfig),
    iconOnClick: props.onRemove,
    onClick: handleBadgeClick,
    'data-test-subj': getDataTestSubj(valueLabelConfig),
    readonly: props.readonly,
  };

  const popoverProps: FilterPopoverProps = {
    id: `popoverFor_filter${id}`,
    className: `globalFilterItem__popover`,
    anchorClassName: `globalFilterItem__popoverAnchor`,
    isOpen: isPopoverOpen,
    closePopover: () => {
      setIsPopoverOpen(false);
    },
    button: <FilterView {...filterViewProps} />,
    panelPaddingSize: 'none',
  };

  if (props.readonly) {
    return (
      <EuiPopover
        panelClassName="globalFilterItem__readonlyPanel"
        anchorPosition="upCenter"
        {...popoverProps}
      >
        <FilterView {...filterViewProps} hideAlias />
      </EuiPopover>
    );
  }

  return (
    <EuiPopover anchorPosition="downLeft" {...popoverProps}>
      <EuiContextMenu initialPanelId={0} panels={getPanels()} />
    </EuiPopover>
  );
}

// eslint-disable-next-line import/no-default-export
export default FilterItem;
