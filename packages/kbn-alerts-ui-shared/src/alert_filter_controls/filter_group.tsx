/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { ControlInputTransform } from '@kbn/controls-plugin/common';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import type {
  ControlGroupContainer,
  ControlGroupInput,
  ControlGroupInputBuilder,
  ControlGroupOutput,
  ControlGroupRendererProps,
  DataControlInput,
} from '@kbn/controls-plugin/public';
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Subscription } from 'rxjs';
import { debounce, isEqual, isEqualWith } from 'lodash';
import type {
  ControlGroupCreationOptions,
  FieldFilterPredicate,
} from '@kbn/controls-plugin/public/control_group/types';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import type { FilterGroupProps, FilterControlConfig } from './types';
import './index.scss';
import { FilterGroupLoading } from './loading';
import { useControlGroupSyncToLocalStorage } from './hooks/use_control_group_sync_to_local_storage';
import { useViewEditMode } from './hooks/use_view_edit_mode';
import { FilterGroupContextMenu } from './context_menu';
import { AddControl, SaveControls } from './buttons';
import {
  getFilterControlsComparator,
  getFilterItemObjListFromControlInput,
  mergeControls,
  reorderControlsWithDefaultControls,
} from './utils';
import { FiltersChangedBanner } from './filters_changed_banner';
import { FilterGroupContext } from './filter_group_context';
import { COMMON_OPTIONS_LIST_CONTROL_INPUTS, TEST_IDS, TIMEOUTS, URL_PARAM_KEY } from './constants';
import { URL_PARAM_ARRAY_EXCEPTION_MSG } from './translations';

export const FilterGroup = (props: PropsWithChildren<FilterGroupProps>) => {
  const {
    dataViewId,
    onFiltersChange,
    timeRange,
    filters,
    query,
    chainingSystem,
    defaultControls,
    spaceId,
    onInit,
    controlsUrlState,
    setControlsUrlState,
    maxControls = Infinity,
    ControlGroupRenderer,
    Storage,
    featureIds,
  } = props;

  const filterChangedSubscription = useRef<Subscription>();
  const inputChangedSubscription = useRef<Subscription>();
  const [urlStateInitialized, setUrlStateInitialized] = useState(false);

  const [controlsFromUrl, setControlsFromUrl] = useState(controlsUrlState ?? []);

  const defaultControlsObj = useMemo(
    () =>
      defaultControls.reduce<Record<string, (typeof defaultControls)[0]>>((prev, current) => {
        prev[current.fieldName] = current;
        return prev;
      }, {}),
    [defaultControls]
  );

  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();

  const localStoragePageFilterKey = useMemo(
    () => `${featureIds.join(',')}.${spaceId}.${URL_PARAM_KEY}`,
    [featureIds, spaceId]
  );

  const currentFiltersRef = useRef<Filter[]>();

  const {
    isViewMode,
    hasPendingChanges,
    pendingChangesPopoverOpen,
    closePendingChangesPopover,
    openPendingChangesPopover,
    switchToViewMode,
    switchToEditMode,
    setHasPendingChanges,
  } = useViewEditMode({
    controlGroup,
  });

  const {
    controlGroupInput: controlGroupInputUpdates,
    setControlGroupInput: setControlGroupInputUpdates,
    getStoredControlGroupInput: getStoredControlInput,
  } = useControlGroupSyncToLocalStorage({
    Storage,
    storageKey: localStoragePageFilterKey,
    shouldSync: isViewMode,
  });

  useEffect(() => {
    if (controlGroupInputUpdates) {
      const formattedFilters = getFilterItemObjListFromControlInput(controlGroupInputUpdates);
      if (!formattedFilters) return;
      if (controlGroupInputUpdates.viewMode !== 'view') return;
      setControlsUrlState?.(formattedFilters);
    }
  }, [controlGroupInputUpdates, setControlsUrlState]);

  const [showFiltersChangedBanner, setShowFiltersChangedBanner] = useState(false);

  const urlDataApplied = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      [filterChangedSubscription.current, inputChangedSubscription.current].forEach((sub) => {
        if (sub) sub.unsubscribe();
      });
    };
  }, []);

  const { filters: validatedFilters, query: validatedQuery } = useMemo(() => {
    try {
      buildEsQuery(
        { fields: [], title: '' },
        query ? [query] : [],
        filters?.filter((f) => f.meta.disabled === false) ?? [],
        {
          nestedIgnoreUnmapped: true,
          dateFormatTZ: undefined,
        }
      );
    } catch (e) {
      // We only need to handle kqlError because control group can handle Lucene error
      // Based on the behaviour from other components, ignore all filters and queries
      // if there is some error in the input filters and queries
      return {
        filters: [],
        query: undefined,
      };
    }
    return {
      filters,
      query,
    };
  }, [filters, query]);

  useEffect(() => {
    controlGroup?.updateInput({
      filters: validatedFilters,
      query: validatedQuery,
      timeRange,
      chainingSystem,
    });
  }, [timeRange, chainingSystem, controlGroup, validatedQuery, validatedFilters]);

  const handleInputUpdates = useCallback(
    (newInput: ControlGroupInput) => {
      if (isEqual(getStoredControlInput(), newInput)) {
        return;
      }
      if (!isEqual(newInput.panels, getStoredControlInput()?.panels) && !isViewMode) {
        setHasPendingChanges(true);
      }
      setControlGroupInputUpdates(newInput);
    },
    [setControlGroupInputUpdates, getStoredControlInput, isViewMode, setHasPendingChanges]
  );

  const handleOutputFilterUpdates = useCallback(
    ({ filters: newFilters, embeddableLoaded }: ControlGroupOutput) => {
      const haveAllEmbeddablesLoaded = Object.values(embeddableLoaded).every((v) =>
        Boolean(v ?? true)
      );
      if (isEqual(currentFiltersRef.current, newFilters)) return;
      if (!haveAllEmbeddablesLoaded) return;
      if (onFiltersChange) onFiltersChange(newFilters ?? []);
      currentFiltersRef.current = newFilters ?? [];
    },
    [onFiltersChange]
  );

  const debouncedFilterUpdates = useMemo(
    () => debounce(handleOutputFilterUpdates, TIMEOUTS.FILTER_UPDATES_DEBOUNCE_TIME),
    [handleOutputFilterUpdates]
  );

  const initializeUrlState = useCallback(() => {
    try {
      if (!Array.isArray(controlsUrlState)) {
        throw new Error(URL_PARAM_ARRAY_EXCEPTION_MSG);
      }
      const storedControlGroupInput = getStoredControlInput();
      if (storedControlGroupInput) {
        const panelsFormatted = getFilterItemObjListFromControlInput(storedControlGroupInput);
        if (
          controlsUrlState.length &&
          !isEqualWith(
            panelsFormatted,
            controlsUrlState,
            getFilterControlsComparator('fieldName', 'title')
          )
        ) {
          setShowFiltersChangedBanner(true);
          switchToEditMode();
        }
      }
      setControlsFromUrl(controlsUrlState);
    } catch (err) {
      // if there is an error ignore url Param
      // eslint-disable-next-line no-console
      console.error(err);
    }
    setUrlStateInitialized(true);
  }, [controlsUrlState, getStoredControlInput, switchToEditMode]);

  useEffect(() => {
    if (controlsUrlState && !urlStateInitialized) {
      initializeUrlState();
    }

    if (!controlGroup) {
      return;
    }

    filterChangedSubscription.current = controlGroup.getOutput$().subscribe({
      next: debouncedFilterUpdates,
    });

    inputChangedSubscription.current = controlGroup.getInput$().subscribe({
      next: handleInputUpdates,
    });

    return () => {
      [filterChangedSubscription.current, inputChangedSubscription.current].forEach((sub) => {
        if (sub) sub.unsubscribe();
      });
    };
  }, [
    controlGroup,
    controlsUrlState,
    debouncedFilterUpdates,
    getStoredControlInput,
    handleInputUpdates,
    initializeUrlState,
    switchToEditMode,
    urlStateInitialized,
  ]);

  const onControlGroupLoadHandler = useCallback(
    (controlGroupContainer: ControlGroupContainer) => {
      if (!controlGroupContainer) return;
      if (onInit) onInit(controlGroupContainer);
      setControlGroup(controlGroupContainer);
    },
    [onInit]
  );

  const selectControlsWithPriority = useCallback(() => {
    /*
     *
     * Below is the priority of how controls are fetched.
     *  1. URL
     *  2. If not found in URL, see in Localstorage
     *  3. If not found in Localstorage, defaultControls are assigned
     *
     * */

    let controlsFromLocalStorage: FilterControlConfig[] = [];
    const storedControlGroupInput = getStoredControlInput();
    if (storedControlGroupInput) {
      controlsFromLocalStorage = getFilterItemObjListFromControlInput(storedControlGroupInput);
    }
    let overridingControls = mergeControls({
      controlsWithPriority: [controlsFromUrl, controlsFromLocalStorage],
      defaultControlsObj,
    });

    if (!overridingControls || overridingControls.length === 0) return defaultControls;

    overridingControls = overridingControls.map((item) => {
      return {
        // give default value to params which are coming from the URL
        fieldName: item.fieldName,
        title: item.title,
        selectedOptions: item.selectedOptions ?? [],
        existsSelected: item.existsSelected ?? false,
        exclude: item.exclude,
      };
    });

    return reorderControlsWithDefaultControls({
      controls: overridingControls,
      defaultControls,
    });
  }, [getStoredControlInput, controlsFromUrl, defaultControlsObj, defaultControls]);

  const fieldFilterPredicate: FieldFilterPredicate = useCallback((f) => f.type !== 'number', []);

  const getCreationOptions: ControlGroupRendererProps['getCreationOptions'] = useCallback(
    async (
      defaultInput: Partial<ControlGroupInput>,
      { addOptionsListControl }: ControlGroupInputBuilder
    ) => {
      const initialInput: Partial<ControlGroupInput> = {
        ...defaultInput,
        defaultControlWidth: 'small',
        viewMode: ViewMode.VIEW,
        timeRange,
        filters,
        query,
        chainingSystem,
      };

      const finalControls = selectControlsWithPriority();

      urlDataApplied.current = true;

      finalControls.forEach((control, idx) => {
        addOptionsListControl(initialInput, {
          controlId: String(idx),
          ...COMMON_OPTIONS_LIST_CONTROL_INPUTS,
          // option List controls will handle an invalid dataview
          // & display an appropriate message
          dataViewId: dataViewId ?? '',
          ...control,
        });
      });

      return {
        initialInput,
        settings: {
          showAddButton: false,
          staticDataViewId: dataViewId ?? '',
          editorConfig: {
            hideWidthSettings: true,
            hideDataViewSelector: true,
            hideAdditionalSettings: true,
          },
        },
        fieldFilterPredicate,
      } as ControlGroupCreationOptions;
    },
    [
      dataViewId,
      timeRange,
      filters,
      chainingSystem,
      query,
      selectControlsWithPriority,
      fieldFilterPredicate,
    ]
  );

  const discardChangesHandler = useCallback(() => {
    if (hasPendingChanges) {
      controlGroup?.updateInput({
        panels: getStoredControlInput()?.panels,
      });
    }
    switchToViewMode();
    setShowFiltersChangedBanner(false);
  }, [controlGroup, switchToViewMode, getStoredControlInput, hasPendingChanges]);

  const upsertPersistableControls = useCallback(async () => {
    if (!controlGroup) return;
    const currentPanels = getFilterItemObjListFromControlInput(controlGroup.getInput());

    const reorderedControls = reorderControlsWithDefaultControls({
      controls: currentPanels,
      defaultControls,
    });

    if (!isEqualWith(reorderedControls, currentPanels, getFilterControlsComparator('fieldName'))) {
      // reorder only if fields are in different order
      // or not same.
      controlGroup?.updateInput({ panels: {} });

      for (const control of reorderedControls) {
        await controlGroup?.addOptionsListControl({
          title: control.title,
          ...COMMON_OPTIONS_LIST_CONTROL_INPUTS,
          // option List controls will handle an invalid dataview
          // & display an appropriate message
          dataViewId: dataViewId ?? '',
          selectedOptions: control.selectedOptions,
          ...control,
        });
      }
    }
  }, [controlGroup, dataViewId, defaultControls]);

  const saveChangesHandler = useCallback(async () => {
    await upsertPersistableControls();
    switchToViewMode();
    setShowFiltersChangedBanner(false);
  }, [switchToViewMode, upsertPersistableControls]);

  const newControlInputTransform: ControlInputTransform = useCallback(
    (newInput, controlType) => {
      // for any new controls, we want to avoid
      // default placeholder
      let result = newInput;
      if (controlType === OPTIONS_LIST_CONTROL) {
        result = {
          ...newInput,
          ...COMMON_OPTIONS_LIST_CONTROL_INPUTS,
        };

        if ((newInput as DataControlInput).fieldName in defaultControlsObj) {
          result = {
            ...result,
            ...defaultControlsObj[(newInput as DataControlInput).fieldName],
            //  title should not be overridden by the initial controls, hence the hardcoding
            title: newInput.title ?? result.title,
          };
        }
      }
      return result;
    },
    [defaultControlsObj]
  );

  const addControlsHandler = useCallback(() => {
    controlGroup?.openAddDataControlFlyout({
      controlInputTransform: newControlInputTransform,
    });
  }, [controlGroup, newControlInputTransform]);

  if (!spaceId) {
    return <FilterGroupLoading />;
  }

  return (
    <FilterGroupContext.Provider
      value={{
        dataViewId: dataViewId ?? '',
        initialControls: defaultControls,
        isViewMode,
        controlGroup,
        controlGroupInputUpdates,
        hasPendingChanges,
        pendingChangesPopoverOpen,
        setHasPendingChanges,
        switchToEditMode,
        switchToViewMode,
        openPendingChangesPopover,
        closePendingChangesPopover,
        setShowFiltersChangedBanner,
        saveChangesHandler,
        discardChangesHandler,
      }}
    >
      <div className="filter-group__wrapper">
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
          {Array.isArray(controlsFromUrl) ? (
            <EuiFlexItem grow={true} data-test-subj={TEST_IDS.FILTER_CONTROLS}>
              <ControlGroupRenderer
                ref={onControlGroupLoadHandler}
                getCreationOptions={getCreationOptions}
              />
              {!controlGroup ? <FilterGroupLoading /> : null}
            </EuiFlexItem>
          ) : null}
          {!isViewMode && !showFiltersChangedBanner ? (
            <>
              <EuiFlexItem grow={false}>
                <AddControl
                  onClick={addControlsHandler}
                  isDisabled={
                    controlGroupInputUpdates &&
                    Object.values(controlGroupInputUpdates.panels).length >= maxControls
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SaveControls onClick={saveChangesHandler} />
              </EuiFlexItem>
            </>
          ) : null}
          <EuiFlexItem grow={false}>
            <FilterGroupContextMenu />
          </EuiFlexItem>
        </EuiFlexGroup>
        {showFiltersChangedBanner ? (
          <>
            <EuiSpacer size="l" />
            <FiltersChangedBanner
              saveChangesHandler={saveChangesHandler}
              discardChangesHandler={discardChangesHandler}
            />
          </>
        ) : null}
      </div>
    </FilterGroupContext.Provider>
  );
};
