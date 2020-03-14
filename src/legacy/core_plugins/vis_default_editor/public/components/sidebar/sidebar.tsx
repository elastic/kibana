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
import { Observable } from 'rxjs';
import { keyCodes, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Vis } from 'src/legacy/core_plugins/visualizations/public';
import { AggGroupNames } from '../../legacy_imports';
import { DefaultEditorNavBar, OptionTab } from './navbar';
import { DefaultEditorControls } from './controls';
import { setStateParamValue, useEditorReducer, useEditorFormState, discardChanges } from './state';
import { DefaultEditorAggCommonProps } from '../agg_common_props';
import { SidebarTitle } from './sidebar_title';
import { getSchemasByGroup } from '../../schemas';
import { SavedSearch } from '../../../../../../plugins/discover/public';

interface DefaultEditorSideBarProps {
  isCollapsed: boolean;
  onClickCollapse: () => void;
  optionTabs: OptionTab[];
  vis: Vis;
  unlinkFromSavedSearch: any;
  reloadVisualization: any;
  notifyDirty: any;
  updateEditorObservable: Observable<any>;
  savedSearch?: SavedSearch;
}

function DefaultEditorSideBar({
  isCollapsed,
  onClickCollapse,
  optionTabs,
  vis,
  unlinkFromSavedSearch,
  reloadVisualization,
  notifyDirty,
  updateEditorObservable,
  savedSearch,
}: DefaultEditorSideBarProps) {
  const [selectedTab, setSelectedTab] = useState(optionTabs[0].name);
  const [isDirty, setDirty] = useState(false);

  const dirtyStateChange = ({ isDirty: dirty }: { isDirty: boolean }) => {
    setDirty(dirty);
    notifyDirty(dirty);
    if (!dirty) {
      resetValidity();
    }
  };

  const [state, dispatch] = useEditorReducer(vis, dirtyStateChange);
  const { formState, setTouched, setValidity, resetValidity } = useEditorFormState();

  const responseAggs = useMemo(() => (state.data.aggs ? state.data.aggs.getResponseAggs() : []), [
    state.data.aggs,
  ]);
  const metricSchemas = getSchemasByGroup(vis.type.schemas.all || [], AggGroupNames.Metrics).map(
    s => s.name
  );
  const metricAggs = useMemo(
    () => responseAggs.filter(agg => metricSchemas.includes(get(agg, 'schema'))),
    [responseAggs, metricSchemas]
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

    vis.setState({
      ...vis.serialize(),
      params: state.params,
      data: { aggs: state.data.aggs!.aggs.map(agg => agg.toJSON()) as any },
    });
    setDirty(false);
    notifyDirty(false);
    resetValidity();
    reloadVisualization();
    setTouched(false);
  }, [
    reloadVisualization,
    state,
    formState.invalid,
    setTouched,
    setDirty,
    notifyDirty,
    resetValidity,
    isDirty,
    vis,
  ]);

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
    const resetHandler = () => dispatch(discardChanges(vis));
    const subscription = updateEditorObservable.subscribe(resetHandler);

    return () => subscription.unsubscribe();
  }, [dispatch, vis, updateEditorObservable]);

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
    aggs: state.data.aggs!,
    hasHistogramAgg,
    stateParams: state.params,
    vis,
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
            {vis.type.requiresSearch && (
              <SidebarTitle
                vis={vis}
                unlinkFromSavedSearch={unlinkFromSavedSearch}
                savedSearch={savedSearch}
              />
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
        aria-label={i18n.translate('visDefaultEditor.sidebar.collapseButtonAriaLabel', {
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
