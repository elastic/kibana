/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './filter_item.scss';

import {
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiPopover,
  EuiPopoverProps,
  euiShadowMedium,
  useEuiTheme,
} from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n-react';
import {
  Filter,
  isFilterPinned,
  toggleFilterNegated,
  toggleFilterPinned,
  toggleFilterDisabled,
} from '@kbn/es-query';
import classNames from 'classnames';
import React, {
  MouseEvent,
  useState,
  useEffect,
  HTMLAttributes,
  useMemo,
  useCallback,
} from 'react';
import { IUiSettingsClient } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { css } from '@emotion/react';
import { getIndexPatternFromFilter, getDisplayValueFromFilter } from '@kbn/data-plugin/public';
import { FilterEditor } from '../filter_editor/filter_editor';
import { FilterView } from '../filter_view';
import { FilterPanelOption } from '../../types';
import {
  withCloseFilterEditorConfirmModal,
  WithCloseFilterEditorConfirmModalProps,
} from '../filter_editor';

export interface FilterItemProps extends WithCloseFilterEditorConfirmModalProps {
  id: string;
  filter: Filter;
  indexPatterns: DataView[];
  className?: string;
  onUpdate: (filter: Filter) => void;
  onRemove: () => void;
  intl: InjectedIntl;
  uiSettings: IUiSettingsClient;
  hiddenPanelOptions?: FilterPanelOption[];
  timeRangeForSuggestionsOverride?: boolean;
  readOnly?: boolean;
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

export const FILTER_EDITOR_WIDTH = 960;

function FilterItemComponent(props: FilterItemProps) {
  const { onCloseFilterPopover, onLocalFilterCreate, onLocalFilterUpdate } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const [renderedComponent, setRenderedComponent] = useState('menu');
  const { id, filter, indexPatterns, hiddenPanelOptions, readOnly = false } = props;

  const closePopover = useCallback(() => {
    onCloseFilterPopover([() => setIsPopoverOpen(false)]);
  }, [onCloseFilterPopover]);

  const euiTheme = useEuiTheme();

  /** @todo important style should be remove after fixing elastic/eui/issues/6314. */
  const popoverDragAndDropStyle = useMemo(
    () =>
      css`
        // Always needed for popover with drag & drop in them
        transform: none !important;
        transition: none !important;
        filter: none !important;
        ${euiShadowMedium(euiTheme)}
      `,
    [euiTheme]
  );

  useEffect(() => {
    if (isPopoverOpen) {
      setRenderedComponent('menu');
    }
  }, [isPopoverOpen]);

  function handleBadgeClick(e: MouseEvent<HTMLInputElement>) {
    if (e.shiftKey) {
      onToggleDisabled();
    } else {
      setIsPopoverOpen(!isPopoverOpen);
    }
  }

  function handleIconClick() {
    props.onRemove();
    setIsPopoverOpen(false);
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
    const valueLabel = isValidLabel(labelConfig) ? labelConfig.title : labelConfig.status;
    const dataTestSubjValue = valueLabel ? `filter-value-${valueLabel.replace(/\s/g, '')}` : '';
    const dataTestSubjNegated = filter.meta.negate ? 'filter-negated' : '';
    const dataTestSubjDisabled = `filter-${isDisabled(labelConfig) ? 'disabled' : 'enabled'}`;
    const dataTestSubjPinned = `filter-${isFilterPinned(filter) ? 'pinned' : 'unpinned'}`;
    const dataTestSubjId = `filter-id-${id}`;
    return classNames(
      'filter',
      dataTestSubjDisabled,
      dataTestSubjKey,
      dataTestSubjValue,
      dataTestSubjPinned,
      dataTestSubjNegated,
      dataTestSubjId
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
        'data-test-subj': 'editFilter',
        onClick: () => {
          setRenderedComponent('editFilter');
        },
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
        (pItem) => !hiddenPanelOptions.includes(pItem['data-test-subj'] as FilterPanelOption)
      );
    }
    return [
      {
        id: 0,
        items: mainPanelItems,
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
    const label: LabelOptions = {
      title: '',
      message: '',
      status: FILTER_ITEM_OK,
    };

    if (filter.meta?.isMultiIndex) {
      return label;
    }

    if (isFilterApplicable()) {
      try {
        label.title = getDisplayValueFromFilter(filter, indexPatterns);
      } catch (e) {
        label.status = FILTER_ITEM_WARNING;
        label.title = props.intl.formatMessage({
          id: 'unifiedSearch.filter.filterBar.labelWarningText',
          defaultMessage: `Warning`,
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

  const valueLabelConfig = getValueLabel();

  // Disable errored filters and re-render
  if (valueLabelConfig.status === FILTER_ITEM_ERROR && !filter.meta.disabled) {
    filter.meta.disabled = true;
    props.onUpdate(filter);
    return null;
  }

  const filterViewProps = {
    filter,
    readOnly,
    valueLabel: valueLabelConfig.title,
    filterLabelStatus: valueLabelConfig.status,
    errorMessage: valueLabelConfig.message,
    className: getClasses(!!filter.meta.negate, valueLabelConfig),
    dataViews: indexPatterns,
    iconOnClick: handleIconClick,
    onClick: handleBadgeClick,
    'data-test-subj': getDataTestSubj(valueLabelConfig),
  };

  const popoverProps: FilterPopoverProps = {
    id: `popoverFor_filter${id}`,
    className: `globalFilterItem__popover`,
    anchorClassName: `globalFilterItem__popoverAnchor`,
    isOpen: isPopoverOpen,
    closePopover,
    button: <FilterView {...filterViewProps} />,
    panelPaddingSize: 'none',
    panelProps: {
      css: popoverDragAndDropStyle,
    },
  };

  return readOnly ? (
    <FilterView {...filterViewProps} />
  ) : (
    <EuiPopover anchorPosition="downLeft" {...popoverProps}>
      {renderedComponent === 'menu' ? (
        <EuiContextMenu initialPanelId={0} panels={getPanels()} />
      ) : (
        <EuiContextMenuPanel
          items={[
            <div style={{ width: FILTER_EDITOR_WIDTH, maxWidth: '100%' }} key="filter-editor">
              <FilterEditor
                filter={filter}
                indexPatterns={indexPatterns}
                onSubmit={onSubmit}
                onLocalFilterUpdate={onLocalFilterUpdate}
                onLocalFilterCreate={onLocalFilterCreate}
                onCancel={() => setIsPopoverOpen(false)}
                timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
              />
            </div>,
          ]}
        />
      )}
    </EuiPopover>
  );
}

export const FilterItem = withCloseFilterEditorConfirmModal(FilterItemComponent);

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterItem;
