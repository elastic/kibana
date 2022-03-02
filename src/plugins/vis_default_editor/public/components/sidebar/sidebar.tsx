/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  memo,
  useMemo,
  useState,
  useCallback,
  KeyboardEventHandler,
  useEffect,
} from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { keys, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EventEmitter } from 'events';

import {
  Vis,
  PersistedState,
  VisualizeEmbeddableContract,
} from 'src/plugins/visualizations/public';
import type { Schema } from 'src/plugins/visualizations/public';
import { TimeRange } from 'src/plugins/data/public';
import { SavedSearch } from 'src/plugins/discover/public';
import { DefaultEditorNavBar } from './navbar';
import { DefaultEditorControls } from './controls';
import { setStateParamValue, useEditorReducer, useEditorFormState, discardChanges } from './state';
import { DefaultEditorAggCommonProps } from '../agg_common_props';
import { SidebarTitle } from './sidebar_title';
import { useOptionTabs } from './use_option_tabs';

interface DefaultEditorSideBarProps {
  embeddableHandler: VisualizeEmbeddableContract;
  isCollapsed: boolean;
  onClickCollapse: () => void;
  uiState: PersistedState;
  vis: Vis;
  isLinkedSearch: boolean;
  eventEmitter: EventEmitter;
  savedSearch?: SavedSearch;
  timeRange: TimeRange;
}

function DefaultEditorSideBarComponent({
  embeddableHandler,
  isCollapsed,
  onClickCollapse,
  uiState,
  vis,
  isLinkedSearch,
  eventEmitter,
  savedSearch,
  timeRange,
}: DefaultEditorSideBarProps) {
  const [isDirty, setDirty] = useState(false);
  const [state, dispatch] = useEditorReducer(vis, eventEmitter);
  const { formState, setTouched, setValidity, resetValidity } = useEditorFormState();
  const [optionTabs, setSelectedTab] = useOptionTabs(vis);

  const responseAggs = useMemo(
    () => (state.data.aggs ? state.data.aggs.getResponseAggs() : []),
    [state.data.aggs]
  );
  const metricSchemas = (vis.type.schemas.metrics || []).map((s: Schema) => s.name);
  const metricAggs = useMemo(
    () => responseAggs.filter((agg) => agg.schema && metricSchemas.includes(agg.schema)),
    [responseAggs, metricSchemas]
  );
  const hasHistogramAgg = useMemo(
    () => responseAggs.some((agg) => agg.type.name === 'histogram'),
    [responseAggs]
  );

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
      data: {
        aggs: state.data.aggs ? (state.data.aggs.aggs.map((agg) => agg.serialize()) as any) : [],
      },
    });
    embeddableHandler.reload();
    eventEmitter.emit('dirtyStateChange', {
      isDirty: false,
    });
    setTouched(false);
  }, [vis, state, formState.invalid, setTouched, isDirty, eventEmitter, embeddableHandler]);

  const onSubmit: KeyboardEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      if (event.ctrlKey && event.key === keys.ENTER) {
        event.preventDefault();
        event.stopPropagation();

        applyChanges();
      }
    },
    [applyChanges]
  );

  useEffect(() => {
    const changeHandler = ({ isDirty: dirty }: { isDirty: boolean }) => {
      setDirty(dirty);

      if (!dirty) {
        resetValidity();
      }
    };
    eventEmitter.on('dirtyStateChange', changeHandler);

    return () => {
      eventEmitter.off('dirtyStateChange', changeHandler);
    };
  }, [resetValidity, eventEmitter]);

  // subscribe on external vis changes using browser history, for example press back button
  useEffect(() => {
    const resetHandler = () => dispatch(discardChanges(vis));
    eventEmitter.on('updateEditor', resetHandler);

    return () => {
      eventEmitter.off('updateEditor', resetHandler);
    };
  }, [dispatch, vis, eventEmitter]);

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
            {vis.type.requiresSearch && (
              <SidebarTitle
                isLinkedSearch={isLinkedSearch}
                savedSearch={savedSearch}
                vis={vis}
                eventEmitter={eventEmitter}
              />
            )}

            {optionTabs.length > 1 && (
              <DefaultEditorNavBar optionTabs={optionTabs} setSelectedTab={setSelectedTab} />
            )}

            {optionTabs.map(({ editor: Editor, name, isSelected = false }) => (
              <div
                key={name}
                className={`visEditorSidebar__config ${
                  isSelected ? '' : 'visEditorSidebar__config-isHidden'
                }`}
              >
                <Editor
                  isTabSelected={isSelected}
                  {...(name === 'data' ? dataTabProps : optionTabProps)}
                  timeRange={timeRange}
                />
              </div>
            ))}
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

const DefaultEditorSideBar = memo(DefaultEditorSideBarComponent);

export { DefaultEditorSideBar };
