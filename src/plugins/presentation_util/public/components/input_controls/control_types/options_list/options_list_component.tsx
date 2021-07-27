/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import classNames from 'classnames';

import {
  EuiButtonEmpty,
  EuiIcon,
  EuiNotificationBadge,
  EuiPopover,
  EuiSelectableOption,
} from '@elastic/eui';
import useMount from 'react-use/lib/useMount';
import { Subject } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';
import useMountedState from 'react-use/lib/useMountedState';
import {
  OptionsListDataFetcher,
  OptionsListEmbeddable,
  OptionsListEmbeddableInput,
} from './options_list_embeddable';
import { InputControlOutput } from '../../embeddable/types';
import { withEmbeddableSubscription } from '../../../../../../embeddable/public';
import { OptionsListStrings } from './options_list_strings';
import { OptionsListPopover } from './options_list_popover_component';

import './options_list.scss';

const toggleAvailableOptions = (
  indices: number[],
  availableOptions: EuiSelectableOption[],
  enabled: boolean
) => {
  const newAvailableOptions = [...availableOptions];
  indices.forEach((index) => (newAvailableOptions[index].checked = enabled ? 'on' : undefined));
  return newAvailableOptions;
};

interface OptionsListProps {
  input: OptionsListEmbeddableInput;
  fetchData: OptionsListDataFetcher;
}

export const OptionsListInner = ({ input, fetchData }: OptionsListProps) => {
  const [availableOptions, setAvailableOptions] = useState<EuiSelectableOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>();

  // raw search string is stored here so it is remembered when popover is closed.
  const [searchString, setSearchString] = useState<string>('');
  const [debouncedSearchString, setDebouncedSearchString] = useState<string>();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [loading, setIsLoading] = useState(false);

  const typeaheadSubject = useMemo(() => new Subject<string>(), []);
  useMount(() => {
    typeaheadSubject
      .pipe(
        tap((rawSearchText) => setSearchString(rawSearchText)),
        debounceTime(100)
      )
      .subscribe((search) => setDebouncedSearchString(search));
    // default selections can be applied here...
  });

  const { indexPattern, timeRange, filters, field, query } = input;
  useEffect(() => {
    let canceled = false;
    setIsLoading(true);
    fetchData({
      search: debouncedSearchString,
      indexPattern,
      timeRange,
      filters,
      field,
      query,
    }).then((newOptions) => {
      if (canceled) return;
      setIsLoading(false);
      // We now have new 'availableOptions', we need to ensure the previously selected options are still selected.
      const enabledIndices: number[] = [];
      selectedOptions?.forEach((selectedOption) => {
        const optionIndex = newOptions.findIndex(
          (availableOption) => availableOption.label === selectedOption
        );
        if (optionIndex >= 0) enabledIndices.push(optionIndex);
      });
      newOptions = toggleAvailableOptions(enabledIndices, newOptions, true);
      setAvailableOptions(newOptions);
    });
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPattern, timeRange, filters, field, query, debouncedSearchString, fetchData]);

  const updateItem = useCallback(
    (index: number) => {
      const item = availableOptions?.[index];
      if (!item) return;

      const toggleOff = availableOptions[index].checked === 'on';

      const newAvailableOptions = toggleAvailableOptions([index], availableOptions, !toggleOff);
      setAvailableOptions(newAvailableOptions);

      setSelectedOptions((currentOptions) => {
        const newOptions = currentOptions ?? new Set<string>();
        if (toggleOff) newOptions.delete(item.label);
        else newOptions.add(item.label);
        return newOptions;
      });
    },
    [availableOptions]
  );

  const selectedOptionsString = Array.from(selectedOptions ?? []).join(
    OptionsListStrings.summary.getSeparator()
  );
  const selectedOptionsLength = Array.from(selectedOptions ?? []).length;

  const { twoLineLayout } = input;
  const button = (
    <EuiButtonEmpty
      color="text"
      className={classNames('optionsList--buttonOverride', {
        'optionsList--buttonOverrideTwoLine': twoLineLayout,
        'optionsList--buttonOverrideSingle': !twoLineLayout,
      })}
      textProps={{
        className: 'optionsList--control',
      }}
      onClick={() => setIsPopoverOpen((openState) => !openState)}
      contentProps={{ className: 'optionsList--buttonContentOverride' }}
    >
      <span
        className={classNames('optionsList--selections', {
          'optionsList--selectionsEmpty': !selectedOptionsLength,
        })}
      >
        {!selectedOptionsLength
          ? OptionsListStrings.summary.getPlaceholder()
          : selectedOptionsString}
      </span>

      <span
        className="optionsList--notification"
        style={{
          visibility: selectedOptionsLength > 1 ? 'visible' : 'hidden',
        }}
      >
        <EuiNotificationBadge size={'m'} color="subdued">
          {selectedOptionsLength}
        </EuiNotificationBadge>
      </span>

      <span className="optionsList--notification">
        <EuiIcon type={'arrowDown'} />
      </span>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id="popoverExampleMultiSelect"
      button={button}
      isOpen={isPopoverOpen}
      className="optionsList--popoverOverride"
      anchorClassName="optionsList--anchorOverride"
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="upLeft"
      ownFocus
      repositionOnScroll
    >
      <OptionsListPopover
        loading={loading}
        updateItem={updateItem}
        searchString={searchString}
        typeaheadSubject={typeaheadSubject}
        availableOptions={availableOptions}
      />
    </EuiPopover>
  );
};

export const OptionsListComponent = withEmbeddableSubscription<
  OptionsListEmbeddableInput,
  InputControlOutput,
  OptionsListEmbeddable,
  { fetchData: OptionsListDataFetcher }
>(OptionsListInner);
