/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { isArray, last, get } from 'lodash';
import React, { Component } from 'react';
import { parse as parseUrl } from 'url';
import PropTypes from 'prop-types';
import { RedirectAppLinks } from '../../../../../../../kibana_react/public';
import { getMetricsField } from '../../lib/get_metrics_field';
import { createTickFormatter } from '../../lib/tick_formatter';
import { createFieldFormatter } from '../../lib/create_field_formatter';
import { isSortable } from './is_sortable';
import { EuiToolTip, EuiIcon } from '@elastic/eui';
import { replaceVars } from '../../lib/replace_vars';
import { ExternalUrlErrorModal } from '../../lib/external_url_error_modal';
import { FormattedMessage } from '@kbn/i18n-react';
import { getFieldFormats, getCoreStart } from '../../../../services';
import { DATA_FORMATTERS } from '../../../../../common/enums';
import { FIELD_FORMAT_IDS } from '../../../../../../../../plugins/field_formats/common';

import {
  createCachedFieldValueFormatter,
  getFieldsForTerms,
  getMultiFieldLabel,
  MULTI_FIELD_VALUES_SEPARATOR,
} from '../../../../../common/fields_utils';

function getColor(rules, colorKey, value) {
  let color;
  if (rules) {
    rules.forEach((rule) => {
      if (rule.operator && rule.value != null) {
        if (_[rule.operator](value, rule.value)) {
          color = rule[colorKey];
        }
      }
    });
  }
  return color;
}

function sanitizeUrl(url) {
  // eslint-disable-next-line no-script-url
  if (parseUrl(url).protocol === 'javascript:') {
    return '';
  }
  return url;
}

class TableVis extends Component {
  constructor(props) {
    super(props);
    this.fieldFormatsService = getFieldFormats();
    this.state = {
      accessDeniedDrilldownUrl: null,
    };
  }

  get visibleSeries() {
    return get(this.props, 'model.series', []).filter((series) => !series.hidden);
  }

  createDrilldownUrlClickHandler = (url) => (event) => {
    const validatedUrl = getCoreStart().http.externalUrl.validateUrl(url);
    if (validatedUrl) {
      this.setState({ accessDeniedDrilldownUrl: null });
    } else {
      event.preventDefault();
      this.setState({ accessDeniedDrilldownUrl: url });
    }
  };

  renderRow = (row, pivotIds, fieldValuesFormatter) => {
    const { model, fieldFormatMap, getConfig } = this.props;

    let rowDisplay = row.key;

    if (pivotIds.length) {
      rowDisplay = pivotIds
        .map((item, index) => {
          const value = [row.key ?? null].flat()[index];
          const formatted = fieldValuesFormatter(item, value, 'html');

          // eslint-disable-next-line react/no-danger
          return <span dangerouslySetInnerHTML={{ __html: formatted ?? value }} />;
        })
        .reduce((prev, curr) => [prev, MULTI_FIELD_VALUES_SEPARATOR, curr]);
    }

    if (model.drilldown_url) {
      const url = replaceVars(model.drilldown_url, {}, { key: row.key }, { noEscape: true });
      const handleDrilldownUrlClick = this.createDrilldownUrlClickHandler(url);
      rowDisplay = (
        <a
          href={sanitizeUrl(url)}
          onClick={handleDrilldownUrlClick}
          onContextMenu={handleDrilldownUrlClick}
        >
          {rowDisplay}
        </a>
      );
    }

    const columns = row.series
      .filter((item) => item)
      .map((item) => {
        const column = this.visibleSeries.find((c) => c.id === item.id);
        if (!column) return null;
        const hasColorRules = column.color_rules?.some(
          ({ value, operator, text }) => value || operator || text
        );
        const formatter =
          column.formatter === DATA_FORMATTERS.DEFAULT
            ? createFieldFormatter(
                getMetricsField(column.metrics),
                fieldFormatMap,
                'html',
                hasColorRules
              )
            : createTickFormatter(column.formatter, column.value_template, getConfig);
        const value = formatter(item.last);
        let trend;
        if (column.trend_arrows) {
          const trendIcon = item.slope > 0 ? 'sortUp' : 'sortDown';
          trend = (
            <span>
              &nbsp; <EuiIcon type={trendIcon} color="subdued" />
            </span>
          );
        }
        const style = { color: getColor(column.color_rules, 'text', item.last) };
        return (
          <td
            key={`${row.key}-${item.id}`}
            data-test-subj="tvbTableVis__value"
            className="eui-textRight"
            style={style}
          >
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: value }} />
            {trend}
          </td>
        );
      });
    return (
      <tr key={row.key}>
        <td>{rowDisplay}</td>
        {columns}
      </tr>
    );
  };

  renderHeader(pivotIds) {
    const { model, uiState, onUiState, visData } = this.props;
    const stateKey = `${model.type}.sort`;
    const sort = uiState.get(stateKey, {
      column: '_default_',
      order: 'asc',
    });

    const calculateHeaderLabel = (metric, item) =>
      item.label || visData.series[0]?.series?.find((s) => item.id === s.id)?.label;

    const columns = this.visibleSeries.map((item) => {
      const metric = last(item.metrics);
      const label = calculateHeaderLabel(metric, item);
      const handleClick = () => {
        if (!isSortable(metric)) return;
        let order;
        if (sort.column === item.id) {
          order = sort.order === 'asc' ? 'desc' : 'asc';
        } else {
          order = 'asc';
        }
        onUiState(stateKey, { column: item.id, order });
      };
      let sortComponent;
      if (isSortable(metric)) {
        let sortIcon;
        if (sort.column === item.id) {
          sortIcon = sort.order === 'asc' ? 'sortUp' : 'sortDown';
        } else {
          sortIcon = 'empty';
        }
        sortComponent = <EuiIcon type={sortIcon} />;
      }
      let headerContent = (
        <span>
          {label} {sortComponent}
        </span>
      );
      if (!isSortable(metric)) {
        headerContent = (
          <EuiToolTip
            content={
              <FormattedMessage
                id="visTypeTimeseries.table.columnNotSortableTooltip"
                defaultMessage="This column is not sortable"
              />
            }
          >
            {headerContent}
          </EuiToolTip>
        );
      }

      return (
        <th onClick={handleClick} key={item.id} scope="col">
          {headerContent}
        </th>
      );
    });
    const label = visData.pivot_label || model.pivot_label || getMultiFieldLabel(pivotIds);
    let sortIcon;
    if (sort.column === '_default_') {
      sortIcon = sort.order === 'asc' ? 'sortUp' : 'sortDown';
    } else {
      sortIcon = 'empty';
    }
    const sortComponent = <EuiIcon type={sortIcon} />;
    const handleSortClick = () => {
      let order;
      if (sort.column === '_default_') {
        order = sort.order === 'asc' ? 'desc' : 'asc';
      } else {
        order = 'asc';
      }
      onUiState(stateKey, { column: '_default_', order });
    };
    return (
      <tr>
        <th className="eui-textLeft" scope="col" onClick={handleSortClick}>
          {label} {sortComponent}
        </th>
        {columns}
      </tr>
    );
  }

  closeExternalUrlErrorModal = () => this.setState({ accessDeniedDrilldownUrl: null });

  render() {
    const { visData, model, indexPattern } = this.props;
    const { accessDeniedDrilldownUrl } = this.state;
    const fields = (model.pivot_type ? [model.pivot_type ?? null].flat() : []).map(
      (type, index) => ({
        name: [model.pivot_id ?? null].flat()[index],
        type,
      })
    );
    const fieldValuesFormatter = createCachedFieldValueFormatter(
      indexPattern,
      fields,
      this.fieldFormatsService,
      model.drilldown_url ? [FIELD_FORMAT_IDS.URL] : []
    );
    const pivotIds = getFieldsForTerms(model.pivot_id);
    const header = this.renderHeader(pivotIds);
    let rows = null;

    if (isArray(visData.series) && visData.series.length) {
      rows = visData.series.map((item) => this.renderRow(item, pivotIds, fieldValuesFormatter));
    }

    return (
      <>
        <RedirectAppLinks
          application={getCoreStart().application}
          className="tvbVis"
          data-test-subj="tableView"
        >
          <table className="table">
            <thead>{header}</thead>
            <tbody>{rows}</tbody>
          </table>
        </RedirectAppLinks>
        {accessDeniedDrilldownUrl && (
          <ExternalUrlErrorModal
            url={accessDeniedDrilldownUrl}
            handleClose={this.closeExternalUrlErrorModal}
          />
        )}
      </>
    );
  }
}

TableVis.defaultProps = {
  sort: {},
};

TableVis.propTypes = {
  visData: PropTypes.object,
  model: PropTypes.object,
  backgroundColor: PropTypes.string,
  onPaginate: PropTypes.func,
  onUiState: PropTypes.func,
  uiState: PropTypes.object,
  pageNumber: PropTypes.number,
  getConfig: PropTypes.func,
  indexPattern: PropTypes.object,
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TableVis as default };
