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

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { Vis, VisState } from 'ui/vis';
import { PersistedState } from 'ui/persisted_state';
import { DefaultEditorNavBar, OptionTab } from './navbar';
import { EditorActions } from '../../state/actions';
import { AggGroupNames } from '../../agg_groups';

interface DefaultEditorSideBarProps {
  actions: EditorActions;
  optionTabs: OptionTab[];
  state: VisState;
  uiState: PersistedState;
  vis: Vis;
}

function DefaultEditorSideBar({
  actions,
  optionTabs,
  state,
  uiState,
  vis,
}: DefaultEditorSideBarProps) {
  const [selectedTab, setSelectedTab] = useState(optionTabs[0].name);

  const responseAggs = useMemo(() => state.aggs.getResponseAggs(), [state.aggs]);
  const metricAggs = useMemo(
    () => responseAggs.filter(agg => get(agg, 'schema.group') === AggGroupNames.Metrics),
    [responseAggs]
  );
  const hasHistogramAgg = useMemo(() => responseAggs.some(agg => agg.type.name === 'histogram'), [
    responseAggs,
  ]);

  const setValidity = () => {};
  const setTouched = () => {};

  const dataTabProps = {
    actions,
    metricAggs,
    state,
    schemas: vis.type.schemas,
    setValidity,
    setTouched,
  };

  const optionTabProps = {
    aggs: state.aggs,
    hasHistogramAgg,
    stateParams: state.params,
    vis,
    uiState,
    setValue: actions.setStateParamValue,
    setValidity,
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
            <DefaultEditorNavBar
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

export { DefaultEditorSideBar };
