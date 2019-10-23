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

import React, { useState, useEffect, useCallback } from 'react';
import { has } from 'lodash';
import { i18n } from '@kbn/i18n';
import { keyCodes, EuiTabbedContent } from '@elastic/eui';

import { VisEditorNavBar, OptionTab } from './vis_editor_navbar';
import { DefaultEditorDataTab } from './components/data_tab';
import { safeMakeLabel } from './controls/agg_utils';
import { VisOptionsProps } from './vis_options_props';

interface VisEditorSideBarProps {
  hasHistogramAgg?: boolean;
  optionTabs: OptionTab[];
}

function VisEditorSideBar({
  hasHistogramAgg,
  optionTabs,
  metricAggs,
  vis,
  stageEditableVis,
  state,
  uiState,
  onParamChange,
  setVisType,
  removeAgg,
  reorderAggs,
  onToggleEnableAgg,
  dispatch,
}: VisEditorSideBarProps) {
  const [selectedTab, setSelectedTab] = useState(optionTabs[0].name);
  const [aggsLabels, setAggsLabels] = useState('');

  useEffect(() => {
    const labels = state.aggs.aggs
      .map(agg => {
        return safeMakeLabel(agg);
      })
      .join();

    setAggsLabels(labels);
  });

  const setStateParamValue = useCallback(
    (paramName, value) => onParamChange(state.params, paramName, value),
    [onParamChange, state.params]
  );

  const setValidity = () => {
    console.log('setValidity');
  };
  const setTouched = () => {
    console.log('setTouched');
  };

  const dataTabProps = {
    dispatch,
    metricAggs,
    state,
    schemas: vis.type.schemas,
    removeAgg,
  };

  const optionTabProps = {
    aggs: state.aggs,
    aggsLabels,
    hasHistogramAgg,
    stateParams: state.params,
    vis,
    uiState,
    setValue: setStateParamValue,
    setValidity,
    setVisType,
    setTouched,
  };

  return (
    <div className="visEditor__sidebar">
      <div className="visEditorSidebar__container">
        <form className="visEditorSidebar__form" name="visualizeEditor">
          {vis.type.requiresSearch && vis.type.options.showIndexSelection && (
            <h2
              aria-label={i18n.translate('common.ui.vis.editors.sidebar.indexPatternAriaLabel', {
                defaultMessage: 'Index pattern: {title}',
                values: {
                  title: vis.indexPattern.title,
                },
              })}
              className="visEditorSidebar__indexPattern"
              tabIndex={0}
            >
              {vis.indexPattern.title}
            </h2>
          )}

          {optionTabs.length > 1 && (
            <VisEditorNavBar
              optionTabs={optionTabs}
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
          )}

          {optionTabs.map(({ editor: Editor, name }) => (
            <div
              key={name}
              className={`visEditorSidebar__config ${
                selectedTab === name ? '' : 'visEditorSidebar__config--hidden'
              }`}
            >
              <Editor {...(name === 'data' ? dataTabProps : optionTabProps)} />
            </div>
          ))}
        </form>
      </div>
    </div>
  );
}

export { VisEditorSideBar };
