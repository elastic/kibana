/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { ColorPicker } from '../../color_picker';
import { AddDeleteButtons } from '../../add_delete_buttons';
import { SeriesConfig } from '../../series_config';
import { Split } from '../../split';
import { SeriesDragHandler } from '../../series_drag_handler';
import {
  EuiTabs,
  EuiTab,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
} from '@elastic/eui';
import { createTextHandler } from '../../lib/create_text_handler';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';
import { Aggs } from '../../aggs/aggs';

export const TopNSeries = injectI18n(function (props) {
  const {
    panel,
    model,
    name,
    fields,
    onAdd,
    onChange,
    onDelete,
    disableDelete,
    disableAdd,
    selectedTab,
    visible,
    intl,
    uiRestrictions,
  } = props;

  const handleChange = createTextHandler(onChange);

  let caretIcon = 'arrowDown';
  if (!visible) caretIcon = 'arrowRight';

  let body = null;
  if (visible) {
    let seriesBody;
    if (selectedTab === 'metrics') {
      seriesBody = (
        <div>
          <Aggs
            onChange={props.onChange}
            fields={fields}
            panel={panel}
            model={model}
            name={name}
            uiRestrictions={uiRestrictions}
            dragHandleProps={props.dragHandleProps}
          />
          <div className="tvbAggRow tvbAggRow--split">
            <Split
              onChange={props.onChange}
              fields={fields}
              panel={panel}
              model={model}
              uiRestrictions={uiRestrictions}
            />
          </div>
        </div>
      );
    } else {
      seriesBody = (
        <SeriesConfig
          fields={props.fields}
          panel={props.panel}
          model={props.model}
          onChange={props.onChange}
          indexPatternForQuery={props.indexPatternForQuery}
        />
      );
    }
    body = (
      <div className="tvbSeries__body">
        <EuiTabs size="s">
          <EuiTab isSelected={selectedTab === 'metrics'} onClick={() => props.switchTab('metrics')}>
            <FormattedMessage
              id="visTypeTimeseries.topN.tab.metricsLabel"
              defaultMessage="Metrics"
            />
          </EuiTab>
          <EuiTab
            data-test-subj="seriesOptions"
            isSelected={selectedTab === 'options'}
            onClick={() => props.switchTab('options')}
          >
            <FormattedMessage
              id="visTypeTimeseries.topN.tab.optionsLabel"
              defaultMessage="Options"
            />
          </EuiTab>
        </EuiTabs>
        {seriesBody}
      </div>
    );
  }

  const colorPicker = (
    <ColorPicker disableTrash={true} onChange={props.onChange} name="color" value={model.color} />
  );

  return (
    <div className={`${props.className}`} style={props.style}>
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={caretIcon}
            color="text"
            onClick={props.toggleVisible}
            aria-label={intl.formatMessage({
              id: 'visTypeTimeseries.topN.toggleSeriesEditorAriaLabel',
              defaultMessage: 'Toggle series editor',
            })}
            aria-expanded={props.visible}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{colorPicker}</EuiFlexItem>

        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            onChange={handleChange('label')}
            placeholder={intl.formatMessage({
              id: 'visTypeTimeseries.topN.labelPlaceholder',
              defaultMessage: 'Label',
            })}
            value={model.label}
          />
        </EuiFlexItem>

        <SeriesDragHandler
          dragHandleProps={props.dragHandleProps}
          hideDragHandler={props.disableDelete}
        />

        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            addTooltip={intl.formatMessage({
              id: 'visTypeTimeseries.topN.addSeriesTooltip',
              defaultMessage: 'Add Series',
            })}
            deleteTooltip={intl.formatMessage({
              id: 'visTypeTimeseries.topN.deleteSeriesTooltip',
              defaultMessage: 'Delete Series',
            })}
            cloneTooltip={intl.formatMessage({
              id: 'visTypeTimeseries.topN.cloneSeriesTooltip',
              defaultMessage: 'Clone Series',
            })}
            onDelete={onDelete}
            onClone={props.onClone}
            onAdd={onAdd}
            togglePanelActivation={props.togglePanelActivation}
            isPanelActive={!model.hidden}
            disableDelete={disableDelete}
            disableAdd={disableAdd}
            responsive={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {body}
    </div>
  );
});

TopNSeries.propTypes = {
  className: PropTypes.string,
  colorPicker: PropTypes.bool,
  disableAdd: PropTypes.bool,
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  name: PropTypes.string,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onClone: PropTypes.func,
  onDelete: PropTypes.func,
  model: PropTypes.object,
  panel: PropTypes.object,
  selectedTab: PropTypes.string,
  style: PropTypes.object,
  switchTab: PropTypes.func,
  toggleVisible: PropTypes.func,
  visible: PropTypes.bool,
  togglePanelActivation: PropTypes.func,
  uiRestrictions: PropTypes.object,
  dragHandleProps: PropTypes.object,
  indexPatternForQuery: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
};
