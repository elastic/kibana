import React from 'react';
import {
  EuiFieldSearch,
  EuiFilterSelectItem,
  EuiLoadingChart,
  EuiPopoverTitle,
  EuiSelectableOption,
  EuiSpacer,
} from '@elastic/eui';

interface OptionsListPopoverProps {
  availableOptions: EuiSelectableOption[];
}

export const OptionsListPopover = ({ availableOptions }: OptionsListPopoverProps) => {
  const loading = (
    <div className="euiFilterSelect__note">
      <div className="euiFilterSelect__noteContent">
        <EuiLoadingChart size="m" />
        <EuiSpacer size="xs" />
        <p>Loading filters</p>
      </div>
    </div>
  );

  const searchBar = (
    <EuiPopoverTitle paddingSize="s">
      <EuiFieldSearch compressed />
    </EuiPopoverTitle>
  );

  return availableOptions && availableOptions.length > 0 ? (
    <>
      {searchBar}
      <div className="optionsList--items">
        {availableOptions.map((item, index) => (
          <EuiFilterSelectItem checked={item.checked} key={index} onClick={() => {}}>
            {item.label}
          </EuiFilterSelectItem>
        ))}
      </div>
    </>
  ) : (
    loading
  );
};
