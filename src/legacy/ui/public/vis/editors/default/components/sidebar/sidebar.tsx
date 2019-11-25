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
import { keyCodes, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Vis, VisState } from 'ui/vis';
import { PersistedState } from 'ui/persisted_state';
import { DefaultEditorNavBar, OptionTab } from './navbar';
import { DefaultEditorControls } from './controls';
import { setStateParamValue, EditorAction, SetValidity, SetTouched } from '../../state';
import { AggGroupNames } from '../../agg_groups';
import { DefaultEditorAggCommonProps } from '../agg_common_props';

interface DefaultEditorSideBarProps {
  dispatch: React.Dispatch<EditorAction>;
  isCollapsed: boolean;
  formState: {
    touched: boolean;
    invalid: boolean;
  };
  onClickCollapse: () => void;
  optionTabs: OptionTab[];
  setTouched: SetTouched;
  setValidity: SetValidity;
  state: VisState;
  uiState: PersistedState;
  vis: Vis;
}

function DefaultEditorSideBar({
  dispatch,
  isCollapsed,
  formState,
  onClickCollapse,
  optionTabs,
  setTouched,
  setValidity,
  state,
  uiState,
  vis,
}: DefaultEditorSideBarProps) {
  const [selectedTab, setSelectedTab] = useState(optionTabs[0].name);
  const [isDirty, setDirty] = useState(false);

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
    setDirty(false);
    setTouched(false);
  }, [vis, state, formState.invalid, setDirty, setTouched]);

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
    });
  }, [vis]);

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
    <EuiFlexGroup
      className="visEditorSidebar"
      direction="column"
      justifyContent="spaceBetween"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem>
        <form className="visEditorSidebar__form" name="visualizeEditor" onKeyDownCapture={onSubmit}>
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

          <EuiButtonIcon
            aria-expanded={!isCollapsed}
            aria-label={i18n.translate('common.ui.vis.editors.sidebar.collapseButtonAriaLabel', {
              defaultMessage: 'Toggle sidebar',
            })}
            className="visEditorSidebar__collapsibleButton"
            data-test-subj="collapseSideBarButton"
            iconType={isCollapsed ? 'arrowLeft' : 'arrowRight'}
            onClick={onClickCollapse}
          />
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
  );
}

export { DefaultEditorSideBar };
