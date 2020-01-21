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

import React, { useMemo, useState, useCallback, KeyboardEventHandler, useEffect } from 'react';
import { get, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { keyCodes, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';

import { Vis } from 'ui/vis';
import { PersistedState } from 'ui/persisted_state';
import { DefaultEditorNavBar, OptionTab } from './navbar';
import { DefaultEditorControls } from './controls';
import { setStateParamValue, useEditorReducer, useEditorFormState } from './state';
import { AggGroupNames } from '../../agg_groups';
import { DefaultEditorAggCommonProps } from '../agg_common_props';

interface DefaultEditorSideBarProps {
  isCollapsed: boolean;
  onClickCollapse: () => void;
  optionTabs: OptionTab[];
  uiState: PersistedState;
  vis: Vis;
}

function DefaultEditorSideBar({
  isCollapsed,
  onClickCollapse,
  optionTabs,
  uiState,
  vis,
}: DefaultEditorSideBarProps) {
  const [selectedTab, setSelectedTab] = useState(optionTabs[0].name);
  const [isDirty, setDirty] = useState(false);
  const [state, dispatch] = useEditorReducer(vis);
  const { formState, setTouched, setValidity, resetValidity } = useEditorFormState();

  const responseAggs = useMemo(() => state.aggs.getResponseAggs(), [state.aggs]);
  const metricAggs = useMemo(
    () => responseAggs.filter(agg => get(agg, 'schema.group') === AggGroupNames.Metrics),
    [responseAggs]
  );
  const hasHistogramAgg = useMemo(() => responseAggs.some(agg => agg.type.name === 'histogram'), [
    responseAggs,
  ]);

  const setStateValidity = useCallback(
    (value: boolean) => {
      setValidity('visOptions', value);
    },
    [setValidity]
  );

  const setStateValue: DefaultEditorAggCommonProps['setStateParamValue'] = useCallback(
    (paramName, value) => {
      const shouldUpdate = !isEqual(state.params[paramName], value);

      if (shouldUpdate) {
        dispatch(setStateParamValue(paramName, value));
      }
    },
    [dispatch, state.params]
  );

  const applyChanges = useCallback(() => {
    if (formState.invalid || !isDirty) {
      setTouched(true);

      return;
    }

    vis.setCurrentState(state);
    vis.updateState();
    vis.emit('dirtyStateChange', {
      isDirty: false,
    });
    setTouched(false);
  }, [vis, state, formState.invalid, setDirty, setTouched, isDirty]);

  const onSubmit: KeyboardEventHandler<HTMLFormElement> = useCallback(
    event => {
      if (event.ctrlKey && event.keyCode === keyCodes.ENTER) {
        event.preventDefault();
        event.stopPropagation();

        applyChanges();
      }
    },
    [applyChanges]
  );

  useEffect(() => {
    vis.on('dirtyStateChange', ({ isDirty: dirty }: { isDirty: boolean }) => {
      setDirty(dirty);

      if (!dirty) {
        resetValidity();
      }
    });
  }, [resetValidity, vis]);

  const dataTabProps = {
    dispatch,
    formIsTouched: formState.touched,
    metricAggs,
    state,
    schemas: vis.type.schemas,
    setValidity,
    setTouched,
    setStateValue,
  };

  const optionTabProps = {
    aggs: state.aggs,
    hasHistogramAgg,
    stateParams: state.params,
    vis,
    uiState,
    setValue: setStateValue,
    setValidity: setStateValidity,
    setTouched,
  };

  return (
    <>
      <EuiFlexGroup
        className="visEditorSidebar"
        direction="column"
        justifyContent="spaceBetween"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem>
          <form
            className="visEditorSidebar__form"
            name="visualizeEditor"
            onKeyDownCapture={onSubmit}
          >
            {vis.type.requiresSearch && vis.type.options.showIndexSelection ? (
              <EuiTitle size="xs" className="visEditorSidebar__indexPattern">
                <h2
                  title={i18n.translate('common.ui.vis.editors.sidebar.indexPatternAriaLabel', {
                    defaultMessage: 'Index pattern: {title}',
                    values: {
                      title: vis.indexPattern.title,
                    },
                  })}
                >
                  {vis.indexPattern.title}
                </h2>
              </EuiTitle>
            ) : (
              <div className="visEditorSidebar__indexPatternPlaceholder" />
            )}

            {optionTabs.length > 1 && (
              <DefaultEditorNavBar
                optionTabs={optionTabs}
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
              />
            )}

            {optionTabs.map(({ editor: Editor, name }) => {
              const isTabSelected = selectedTab === name;

              return (
                <div
                  key={name}
                  className={`visEditorSidebar__config ${
                    isTabSelected ? '' : 'visEditorSidebar__config-isHidden'
                  }`}
                >
                  <Editor
                    isTabSelected={isTabSelected}
                    {...(name === 'data' ? dataTabProps : optionTabProps)}
                  />
                </div>
              );
            })}
          </form>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DefaultEditorControls
            applyChanges={applyChanges}
            dispatch={dispatch}
            isDirty={isDirty}
            isTouched={formState.touched}
            isInvalid={formState.invalid}
            vis={vis}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiButtonIcon
        aria-expanded={!isCollapsed}
        aria-label={i18n.translate('common.ui.vis.editors.sidebar.collapseButtonAriaLabel', {
          defaultMessage: 'Toggle sidebar',
        })}
        className="visEditor__collapsibleSidebarButton"
        data-test-subj="collapseSideBarButton"
        color="text"
        iconType={isCollapsed ? 'menuLeft' : 'menuRight'}
        onClick={onClickCollapse}
      />
    </>
  );
}

export { DefaultEditorSideBar };
