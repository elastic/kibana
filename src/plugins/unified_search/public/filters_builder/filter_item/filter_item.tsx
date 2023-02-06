/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext } from 'react';
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

import { FieldInput } from './field_input';
import { OperatorInput } from './operator_input';
import { ParamsEditor } from './params_editor';
import { getBooleanRelationType } from '../../utils';
import { FiltersBuilderContextType } from '../context';
import { FilterGroup } from '../filter_group';
import type { Path } from '../types';
import { getFieldFromFilter, getOperatorFromFilter } from '../../filter_bar/filter_editor';
import { Operator } from '../../filter_bar/filter_editor';
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
}: FilterItemProps) {
  const {
    dispatch,
    dataView,
    dropTarget,
    globalParams: { hideOr },
    timeRangeForSuggestionsOverride,
    disabled,
  } = useContext(FiltersBuilderContextType);
  const conditionalOperationType = getBooleanRelationType(filter);
  const { euiTheme } = useEuiTheme();
  let field: DataViewField | undefined;
  let operator: Operator | undefined;
  let params: Filter['meta']['params'] | undefined;
  const isMaxNesting = isMaxFilterNesting(path);
  if (!conditionalOperationType) {
    field = getFieldFromFilter(filter, dataView!);
    if (field) {
      operator = getOperatorFromFilter(filter);
      params = getFilterParams(filter);
    }
  }

  const onHandleField = useCallback(
    (selectedField: DataViewField) => {
      dispatch({
        type: 'updateFilter',
        payload: { dest: { path, index }, field: selectedField },
      });
    },
    [dispatch, path, index]
  );

  const onHandleOperator = useCallback(
    (selectedOperator: Operator) => {
      dispatch({
        type: 'updateFilter',
        payload: { dest: { path, index }, field, operator: selectedOperator },
      });
    },
    [dispatch, path, index, field]
  );

  const onHandleParamsChange = useCallback(
    (selectedParams: unknown) => {
      dispatch({
        type: 'updateFilter',
        payload: { dest: { path, index }, field, operator, params: selectedParams },
      });
    },
    [dispatch, path, index, field, operator]
  );

  const onHandleParamsUpdate = useCallback(
    (value: Filter['meta']['params']) => {
      const paramsValues = Array.isArray(params) ? params : [];
      dispatch({
        type: 'updateFilter',
        payload: { dest: { path, index }, field, operator, params: [...paramsValues, value] },
      });
    },
    [dispatch, path, index, field, operator, params]
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
          filters={Array.isArray(filter) ? filter : filter.meta?.params}
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
                    >
                      <EuiFlexItem
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
                              <div data-test-subj="filterParams">
                                <ParamsEditor
                                  dataView={dataView}
                                  field={field}
                                  operator={operator}
                                  params={params}
                                  onHandleParamsChange={onHandleParamsChange}
                                  onHandleParamsUpdate={onHandleParamsUpdate}
                                  timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
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
