import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFieldSearch,
  EuiFilterSelectItem,
  EuiIcon,
  EuiLoadingChart,
  EuiPopoverTitle,
  EuiSelectableOption,
  EuiSpacer,
} from '@elastic/eui';
import { InputControlOutput } from '../../embeddable/types';
import {
  OptionsListDataFetcher,
  OptionsListEmbeddable,
  OptionsListEmbeddableInput,
} from './options_list_embeddable';
import { withEmbeddableSubscription } from '../../../../../../embeddable/public';

interface OptionsListPopoverProps {
  embeddable: OptionsListEmbeddable;
}

const OptionsListPopoverInner = ({ embeddable }: OptionsListPopoverProps) => {
  const { availableOptions } = embeddable.getInput();

  const updateItem = useCallback((index: number) => {
    if (!availableOptions?.[index]) {
      return;
    }
    const newItems = [...availableOptions];
    newItems[index].checked = newItems[index].checked === 'on' ? undefined : 'on';
    embeddable.updateInput({ availableOptions: newItems });
  }, []);

  return (
    <>
      <EuiPopoverTitle paddingSize="s">
        <EuiFieldSearch
          compressed
          onChange={(event) => embeddable.updateInput({ search: event.target.value })}
        />
      </EuiPopoverTitle>
      <div className="optionsList--items">
        {!embeddable.getOutput().loading &&
          availableOptions &&
          availableOptions.map((item, index) => (
            <EuiFilterSelectItem
              checked={item.checked}
              key={index}
              onClick={() => updateItem(index)}
            >
              {item.label}
            </EuiFilterSelectItem>
          ))}
        {embeddable.getOutput().loading && (
          <div className="euiFilterSelect__note">
            <div className="euiFilterSelect__noteContent">
              <EuiLoadingChart size="m" />
              <EuiSpacer size="xs" />
              <p>Loading filters</p>
            </div>
          </div>
        )}

        {(!availableOptions || availableOptions.length === 0) && (
          <div className="euiFilterSelect__note">
            <div className="euiFilterSelect__noteContent">
              <EuiIcon type="minusInCircle" />
              <EuiSpacer size="xs" />
              <p>No filters found</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export const OptionsListPopover = withEmbeddableSubscription<
  OptionsListEmbeddableInput,
  InputControlOutput,
  OptionsListEmbeddable
>(OptionsListPopoverInner);
