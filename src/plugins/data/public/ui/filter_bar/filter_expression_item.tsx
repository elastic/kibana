/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiFlexItem, useInnerText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';
import React, { FC } from 'react';
import type { Filter } from '@kbn/es-query';
import { FILTERS } from '../../../common';
import { existsOperator, isOneOfOperator } from './filter_editor/lib/filter_operators';
import { IIndexPattern } from '../..';
import { getDisplayValueFromFilter, getIndexPatternFromFilter } from '../../query';

const FILTER_ITEM_OK = '';
const FILTER_ITEM_WARNING = 'warn';
const FILTER_ITEM_ERROR = 'error';

export type FilterLabelStatus =
  | typeof FILTER_ITEM_OK
  | typeof FILTER_ITEM_WARNING
  | typeof FILTER_ITEM_ERROR;

interface LabelOptions {
  title: string;
  status: FilterLabelStatus;
  message?: string;
}

interface Props {
  groupedFilters: any;
  indexPatterns: IIndexPattern[];
  onClick: (filter: Filter) => void;
  onRemove: (groupId: string) => void;
  groupId: string;
}

export const FilterExpressionItem: FC<Props> = ({
  groupedFilters,
  indexPatterns,
  onClick,
  onRemove,
  groupId,
}: Props) => {
  /**
   * Checks if filter field exists in any of the index patterns provided,
   * Because if so, a filter for the wrong index pattern may still be applied.
   * This function makes this behavior explicit, but it needs to be revised.
   */
  function isFilterApplicable(filter: Filter) {
    // Any filter is applicable if no index patterns were provided to FilterBar.
    if (!indexPatterns.length) return true;

    const ip = getIndexPatternFromFilter(filter, indexPatterns);
    if (ip) return true;

    const allFields = indexPatterns.map((indexPattern) => {
      return indexPattern.fields.map((field) => field.name);
    });
    const flatFields = allFields.reduce((acc: string[], it: string[]) => [...acc, ...it], []);
    return flatFields.includes(filter.meta?.key || '');
  }

  function getValueLabel(filter: Filter): LabelOptions {
    const label: LabelOptions = {
      title: '',
      message: '',
      status: FILTER_ITEM_OK,
    };

    if (filter.meta?.isMultiIndex) {
      return label;
    }

    if (isFilterApplicable(filter)) {
      try {
        label.title = getDisplayValueFromFilter(filter, indexPatterns);
      } catch (e) {
        label.status = FILTER_ITEM_ERROR;
        label.title = i18n.translate('data.filter.filterBar.labelErrorText', {
          defaultMessage: `Error`,
        });
        label.message = e.message;
      }
    } else {
      label.status = FILTER_ITEM_WARNING;
      label.title = i18n.translate('data.filter.filterBar.labelWarningText', {
        defaultMessage: `Warning`,
      });
      label.message = i18n.translate('data.filter.filterBar.labelWarningInfo', {
        defaultMessage: 'Field {fieldName} does not exist in current view',
        values: { fieldName: filter.meta?.key },
      });
    }

    return label;
  }

  const isDisabled = (labelConfig: LabelOptions, filter: Filter) => {
    const { disabled } = filter.meta;
    return disabled || labelConfig.status === FILTER_ITEM_ERROR;
  };

  const getValue = (text?: string) => {
    return (
      <span
        className={
          text && isNaN(text as any)
            ? 'globalFilterExpression__value'
            : 'globalFilterExpression__value--number'
        }
      >
        {text}
      </span>
    );
  };

  const getFilterContent = (
    filter: Filter,
    label: LabelOptions,
    prefix: string | JSX.Element,
    relationship: string
  ) => {
    switch (filter.meta.type) {
      case FILTERS.EXISTS:
        return (
          <>
            {prefix}
            {filter.meta.key}: {getValue(`${existsOperator.message}`)}
            {relationship && (
              <EuiTextColor
                className="globalFilterExpression__relationship"
                color="rgb(0, 113, 194)"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      case FILTERS.PHRASES:
        return (
          <>
            {prefix}
            {filter.meta.key}: {getValue(`${isOneOfOperator.message} ${label.title}`)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      case FILTERS.QUERY_STRING:
        return (
          <>
            {prefix}
            {getValue(`${label.title}`)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      case FILTERS.PHRASE:
      case FILTERS.RANGE:
        return (
          <>
            {prefix}
            {filter.meta.key}: {getValue(label.title)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      default:
        return (
          <>
            {prefix}
            {getValue(`${JSON.stringify(filter.query) || filter.meta.value}`)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
    }
  };

  const [ref] = useInnerText();
  let filterText = '';
  const filterExpression: JSX.Element[] = [];
  const isGroupNegated = groupedFilters[0].groupNegated ?? false;
  const groupNegatedPrefix = isGroupNegated ? (
    <EuiTextColor color="danger" className="globalFilterExpression__groupNegate">
      NOT
    </EuiTextColor>
  ) : null;
  if (isGroupNegated && groupNegatedPrefix) {
    filterExpression.push(groupNegatedPrefix);
  }
  const groupBySubgroups = groupBy(groupedFilters, 'subGroupId');
  for (const [_, subGroupedFilters] of Object.entries(groupBySubgroups)) {
    const needsParenthesis = subGroupedFilters.length > 1;
    if (needsParenthesis) {
      filterExpression.push(<EuiTextColor color="rgb(0, 113, 194)">(</EuiTextColor>);
    }
    for (const filter of subGroupedFilters) {
      const label = getValueLabel(filter);

      const prefixText = filter.meta.negate
        ? ` ${i18n.translate('data.filter.filterBar.negatedFilterPrefix', {
            defaultMessage: 'NOT ',
          })}`
        : '';
      const prefix =
        filter.meta.negate && !filter.meta.disabled ? (
          <EuiTextColor color="danger">{prefixText}</EuiTextColor>
        ) : (
          prefixText
        );
      const relationship = groupedFilters.length > 1 ? filter.relationship || '' : '';

      const filterContent = getFilterContent(filter, label, prefix, relationship);
      filterExpression.push(filterContent);

      const text = label.title;
      filterText += `${filter?.meta?.key}: ${text} ${
        groupedFilters.length > 1 ? filter.relationship || '' : ''
      } `;
    }
    if (needsParenthesis) {
      filterExpression.push(<EuiTextColor color="rgb(0, 113, 194)">)</EuiTextColor>);
    }
  }

  const badge = (
    <EuiFlexItem key={groupId} grow={false} className="globalFilterBar__flexItem">
      <EuiBadge
        title={filterText}
        color="hollow"
        iconType="cross"
        iconSide="right"
        style={{ cursor: 'pointer', padding: '5px' }}
        closeButtonProps={{
          tabIndex: -1,
        }}
        className={
          isDisabled(getValueLabel(groupedFilters[0]), groupedFilters[0])
            ? 'globalFilterExpression-isDisabled'
            : ''
        }
        iconOnClick={() => onRemove(groupId)}
        iconOnClickAriaLabel={i18n.translate('data.filter.filterBar.filteradgeIconAriaLabel', {
          defaultMessage: 'Remove {title}',
          values: { title: filterText },
        })}
        // onClickAriaLabel={i18n.translate('data.filter.filterBar.savedQueryBadgeAriaLabel', {
        //   defaultMessage: 'Selected saved objects actions',
        // })}
        // onClick={() => onClick(savedQuery)}
      >
        <div ref={ref}>
          {/* {filterExpression.length > 1 && <EuiTextColor>(</EuiTextColor>} */}
          {filterExpression.map((expression) => {
            return <>{expression}</>;
          })}
          {/* {filterExpression.length > 1 && <EuiTextColor>)</EuiTextColor>} */}
        </div>
      </EuiBadge>
    </EuiFlexItem>
  );

  return badge;
};
