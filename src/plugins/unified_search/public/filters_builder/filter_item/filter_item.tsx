/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext, useState } from 'react';
import {
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { buildEmptyFilter, getFilterParams, BooleanRelation } from '@kbn/es-query';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { cx } from '@emotion/css';

import { css } from '@emotion/react';
import { FieldInput } from './field_input';
import { OperatorInput } from './operator_input';
import { ParamsEditor } from './params_editor';
import { getBooleanRelationType } from '../../utils';
import { FiltersBuilderContextType } from '../context';
import { FilterGroup } from '../filter_group';
import type { Path } from '../types';
import { getFieldFromFilter, getOperatorFromFilter } from '../../filter_bar/filter_editor';
import { Operator } from '../../filter_bar/filter_editor';
import { getGroupedFilters } from '../utils/filters_builder';
import {
  cursorAddCss,
  cursorOrCss,
  fieldAndParamCss,
  getGrabIconCss,
  operationCss,
  disabledDraggableCss,
} from './filter_item.styles';
import { Tooltip } from './tooltip';
import { FilterItemActions, MinimisedFilterItemActions } from './actions';

export const strings = {
  getDragFilterAriaLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.dragFilterAriaLabel', {
      defaultMessage: 'Drag filter',
    }),
  getReorderingRequirementsLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.dragHandleDisabled', {
      defaultMessage: 'Reordering requires more than one item.',
    }),
};

const MAX_FILTER_NESTING = 5;

export interface FilterItemProps {
  path: Path;
  filter: Filter;
  disableOr: boolean;
  disableAnd: boolean;
  disableRemove: boolean;
  draggable?: boolean;
  color: 'plain' | 'subdued';
  index: number;

  /** @internal used for recursive rendering **/
  renderedLevel: number;
  reverseBackground: boolean;
  filtersCount?: number;
}

const isMaxFilterNesting = (path: string) => {
  const pathArr = path.split('.');
  return pathArr.length - 1 === MAX_FILTER_NESTING;
};

export function FilterItem({
  filter,
  path,
  reverseBackground,
  disableOr,
  disableAnd,
  disableRemove,
  color,
  index,
  renderedLevel,
  draggable = true,
  filtersCount = 1,
}: FilterItemProps) {
  const {
    dispatch,
    dataView,
    dropTarget,
    globalParams: { hideOr },
    timeRangeForSuggestionsOverride,
    filtersForSuggestions,
    disabled,
  } = useContext(FiltersBuilderContextType);
  const conditionalOperationType = getBooleanRelationType(filter);
  const { euiTheme } = useEuiTheme();
  let field: DataViewField | undefined;
  let params: Filter['meta']['params'];
  const isMaxNesting = isMaxFilterNesting(path);
  if (!conditionalOperationType) {
    field = getFieldFromFilter(filter, dataView!);
    if (field) {
      params = getFilterParams(filter);
    }
  }
  const [operator, setOperator] = useState<Operator | undefined>(() => {
    if (!conditionalOperationType && field) {
      return getOperatorFromFilter(filter);
    }
  });
  const [multiValueFilterParams, setMultiValueFilterParams] = useState<
    Array<Filter | boolean | string | number>
  >(Array.isArray(params) ? params : []);

  const onHandleField = useCallback(
    (selectedField: DataViewField) => {
      setOperator(undefined);
      dispatch({
        type: 'updateFilter',
        payload: { dest: { path, index }, field: selectedField },
      });
    },
    [dispatch, path, index]
  );

  const onHandleOperator = useCallback(
    (selectedOperator: Operator) => {
      const preservedParams =
        params && selectedOperator.getParamsFromPrevOperator?.(operator, params);
      setMultiValueFilterParams(Array.isArray(preservedParams) ? preservedParams : []);
      setOperator(selectedOperator);
      dispatch({
        type: 'updateFilter',
        payload: {
          dest: { path, index },
          field,
          operator: selectedOperator,
          params: params && selectedOperator.getParamsFromPrevOperator?.(operator, params),
        },
      });
    },
    [dispatch, path, index, field, operator, params]
  );

  const onHandleParamsChange = useCallback(
    (selectedParams: Filter['meta']['params']) => {
      if (Array.isArray(selectedParams)) {
        setMultiValueFilterParams(selectedParams);
      }
      dispatch({
        type: 'updateFilter',
        payload: { dest: { path, index }, field, operator, params: selectedParams },
      });
    },
    [dispatch, path, index, field, operator]
  );

  const onHandleParamsUpdate = useCallback(
    (value: Filter | boolean | string | number) => {
      const paramsValues: Array<Filter | boolean | string | number> = Array.isArray(
        multiValueFilterParams
      )
        ? multiValueFilterParams
        : [];
      if (value) {
        paramsValues.push(value);
        setMultiValueFilterParams(paramsValues);
      }
      dispatch({
        type: 'updateFilter',
        payload: {
          dest: { path, index },
          field,
          operator,
          params: paramsValues as Filter['meta']['params'],
        },
      });
    },
    [dispatch, path, index, field, operator, multiValueFilterParams]
  );

  const onRemoveFilter = useCallback(() => {
    dispatch({
      type: 'removeFilter',
      payload: {
        dest: { path, index },
      },
    });
  }, [dispatch, path, index]);

  const onAddFilter = useCallback(
    (booleanRelation: BooleanRelation) => {
      dispatch({
        type: 'addFilter',
        payload: {
          dest: { path, index: index + 1 },
          filter: buildEmptyFilter(false, dataView?.id),
          booleanRelation,
          dataView,
        },
      });
    },
    [dispatch, dataView, path, index]
  );

  const onAddButtonClick = useCallback(() => onAddFilter(BooleanRelation.AND), [onAddFilter]);
  const onOrButtonClick = useCallback(() => onAddFilter(BooleanRelation.OR), [onAddFilter]);

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const ActionsComponent = isMobile ? MinimisedFilterItemActions : FilterItemActions;
  return (
    <div
      className={cx({
        'filter-builder__item': true,
        'filter-builder__item-nested': renderedLevel > 0,
      })}
    >
      {conditionalOperationType ? (
        <FilterGroup
          path={path}
          booleanRelation={conditionalOperationType}
          filters={getGroupedFilters(filter)}
          reverseBackground={!reverseBackground}
          renderedLevel={renderedLevel + 1}
        />
      ) : (
        <EuiDroppable
          droppableId={path}
          spacing="none"
          isCombineEnabled={!disableOr || !hideOr}
          className={cx({ [cursorAddCss]: dropTarget === path })}
          isDropDisabled={disableAnd}
        >
          <EuiDraggable
            spacing="s"
            index={index}
            isDragDisabled={!draggable}
            draggableId={`${path}`}
            customDragHandle={true}
            hasInteractiveChildren={true}
            disableInteractiveElementBlocking
            className={cx(disabledDraggableCss)}
          >
            {(provided) => (
              <EuiFlexGroup
                gutterSize="xs"
                responsive={false}
                alignItems="center"
                justifyContent="center"
                data-test-subj={`filter-${path}`}
              >
                <EuiFlexItem>
                  <EuiPanel color={color} paddingSize={'none'} hasShadow={false}>
                    <EuiFlexGroup
                      responsive={false}
                      alignItems="center"
                      gutterSize="s"
                      justifyContent="center"
                      className={cx({
                        [cursorOrCss]: dropTarget === path && !hideOr,
                      })}
                      css={
                        // With a single filter there's a disabled cursor set at dragging level
                        // so we need to revert such css directive for the rest of the editor row
                        filtersCount === 1
                          ? css`
                              cursor: auto;
                            `
                          : undefined
                      }
                    >
                      <EuiFlexItem
                        role="button"
                        grow={false}
                        aria-label={strings.getDragFilterAriaLabel()}
                        {...provided.dragHandleProps}
                      >
                        <Tooltip
                          content={strings.getReorderingRequirementsLabel()}
                          show={!draggable}
                        >
                          <EuiIcon
                            type="grab"
                            size="s"
                            className={getGrabIconCss(euiTheme)}
                            {...(!draggable ? { color: euiTheme.colors.disabled } : {})}
                          />
                        </Tooltip>
                      </EuiFlexItem>
                      <EuiFlexItem grow={true}>
                        <EuiFlexGroup
                          gutterSize="s"
                          responsive={false}
                          alignItems="center"
                          justifyContent="center"
                          wrap
                        >
                          <EuiFlexItem className={fieldAndParamCss(euiTheme)}>
                            <EuiFormRow>
                              <FieldInput
                                field={field}
                                dataView={dataView}
                                onHandleField={onHandleField}
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                          <EuiFlexItem className={operationCss(euiTheme)}>
                            <EuiFormRow>
                              <OperatorInput
                                field={field}
                                operator={operator}
                                params={params}
                                onHandleOperator={onHandleOperator}
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                          <EuiFlexItem className={fieldAndParamCss(euiTheme)}>
                            <EuiFormRow>
                              <div
                                data-test-subj="filterParams"
                                css={
                                  // The disabled cursor downstream is unset
                                  // so force the correct cursor here based on the operator
                                  operator
                                    ? undefined
                                    : css`
                                        cursor: not-allowed;
                                      `
                                }
                              >
                                <ParamsEditor
                                  dataView={dataView}
                                  field={field}
                                  operator={operator}
                                  params={params}
                                  onHandleParamsChange={onHandleParamsChange}
                                  onHandleParamsUpdate={onHandleParamsUpdate}
                                  timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                                  filtersForSuggestions={filtersForSuggestions}
                                />
                              </div>
                            </EuiFormRow>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ActionsComponent
                          disabled={disabled}
                          disableRemove={disableRemove}
                          hideOr={hideOr || isMaxNesting}
                          hideAnd={isMaxNesting}
                          disableOr={disableOr}
                          disableAnd={disableAnd}
                          onRemoveFilter={onRemoveFilter}
                          onOrButtonClick={onOrButtonClick}
                          onAddButtonClick={onAddButtonClick}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiDraggable>
        </EuiDroppable>
      )}
    </div>
  );
}
