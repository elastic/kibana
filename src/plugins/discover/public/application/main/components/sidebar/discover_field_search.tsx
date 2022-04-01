/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_field_search.scss';

import React, { OptionHTMLAttributes, ReactNode, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiForm,
  EuiFormRow,
  EuiButtonGroup,
  EuiFilterButton,
  EuiSpacer,
  EuiIcon,
  EuiPagination,
  EuiBasicTableColumn,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldIcon } from '@kbn/react-field';
import { getFieldTypeDescription } from './lib/get_field_type_description';
import { usePager } from '../../../../utils/use_pager';
import { useDiscoverServices } from '../../../../utils/use_discover_services';

export interface State {
  searchable: string;
  aggregatable: string;
  type: string;
  missing: boolean;
  [index: string]: string | boolean;
}

export interface Props {
  /**
   * triggered on input of user into search field
   */
  onChange: (field: string, value: string | boolean | undefined) => void;
  /**
   * types for the type filter
   */
  types: string[];
  /**
   * types presented in current data view
   */
  presentFieldTypes: string[];
  /**
   * the input value of the user
   */
  value?: string;
}

interface FieldTypeTableItem {
  id: number;
  dataType: string;
  description: string;
}

const FIELD_TYPES_PER_PAGE = 6;

/**
 * Component is Discover's side bar to  search of available fields
 * Additionally there's a button displayed that allows the user to show/hide more filter fields
 */
export function DiscoverFieldSearch({ onChange, value, types, presentFieldTypes }: Props) {
  const searchPlaceholder = i18n.translate('discover.fieldChooser.searchPlaceHolder', {
    defaultMessage: 'Search field names',
  });
  const aggregatableLabel = i18n.translate('discover.fieldChooser.filter.aggregatableLabel', {
    defaultMessage: 'Aggregatable',
  });
  const searchableLabel = i18n.translate('discover.fieldChooser.filter.searchableLabel', {
    defaultMessage: 'Searchable',
  });
  const typeLabel = i18n.translate('discover.fieldChooser.filter.typeLabel', {
    defaultMessage: 'Type',
  });
  const typeOptions = types
    ? types.map((type) => {
        return { value: type, text: type };
      })
    : [{ value: 'any', text: 'any' }];

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [values, setValues] = useState<State>({
    searchable: 'any',
    aggregatable: 'any',
    type: 'any',
    missing: true,
  });

  const { docLinks } = useDiscoverServices();

  const { curPageIndex, pageSize, totalPages, startIndex, changePageIndex } = usePager({
    initialPageSize: FIELD_TYPES_PER_PAGE,
    totalItems: presentFieldTypes.length,
  });
  const items: FieldTypeTableItem[] = useMemo(() => {
    return presentFieldTypes
      .sort((one, another) => one.localeCompare(another))
      .map((element, index) => ({
        id: index,
        dataType: element,
        description: getFieldTypeDescription(element),
      }))
      .slice(startIndex, pageSize + startIndex);
  }, [pageSize, presentFieldTypes, startIndex]);

  const onHelpClick = () => setIsHelpOpen((prevIsHelpOpen) => !prevIsHelpOpen);
  const closeHelp = () => setIsHelpOpen(false);

  const columnsSidebar: Array<EuiBasicTableColumn<FieldTypeTableItem>> = [
    {
      field: 'dataType',
      name: 'Data type',
      width: '110px',
      render: (name: string) => (
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
          <EuiFlexItem grow={false}>
            <FieldIcon type={name} />
          </EuiFlexItem>
          <EuiFlexItem>{name}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'description',
      name: 'Description',
    },
  ];

  const filterBtnAriaLabel = isPopoverOpen
    ? i18n.translate('discover.fieldChooser.toggleFieldFilterButtonHideAriaLabel', {
        defaultMessage: 'Hide field filter settings',
      })
    : i18n.translate('discover.fieldChooser.toggleFieldFilterButtonShowAriaLabel', {
        defaultMessage: 'Show field filter settings',
      });

  const handleFilterButtonClicked = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const applyFilterValue = (id: string, filterValue: string | boolean) => {
    switch (filterValue) {
      case 'any':
        if (id !== 'type') {
          onChange(id, undefined);
        } else {
          onChange(id, filterValue);
        }
        break;
      case 'true':
        onChange(id, true);
        break;
      case 'false':
        onChange(id, false);
        break;
      default:
        onChange(id, filterValue);
    }
  };

  const isFilterActive = (name: string, filterValue: string | boolean) => {
    return name !== 'missing' && filterValue !== 'any';
  };

  const handleValueChange = (name: string, filterValue: string | boolean) => {
    const previousValue = values[name];
    updateFilterCount(name, previousValue, filterValue);
    const updatedValues = { ...values };
    updatedValues[name] = filterValue;
    setValues(updatedValues);
    applyFilterValue(name, filterValue);
  };

  const updateFilterCount = (
    name: string,
    previousValue: string | boolean,
    currentValue: string | boolean
  ) => {
    const previouslyFilterActive = isFilterActive(name, previousValue);
    const filterActive = isFilterActive(name, currentValue);
    const diff = Number(filterActive) - Number(previouslyFilterActive);
    setActiveFiltersCount(activeFiltersCount + diff);
  };

  const handleMissingChange = (e: EuiSwitchEvent) => {
    const missingValue = e.target.checked;
    handleValueChange('missing', missingValue);
  };

  const buttonContent = (
    <EuiFilterButton
      aria-label={filterBtnAriaLabel}
      data-test-subj="toggleFieldFilterButton"
      iconType="arrowDown"
      isSelected={activeFiltersCount > 0}
      numFilters={0}
      hasActiveFilters={activeFiltersCount > 0}
      numActiveFilters={activeFiltersCount}
      onClick={handleFilterButtonClicked}
    >
      <FormattedMessage
        id="discover.fieldChooser.fieldFilterButtonLabel"
        defaultMessage="Filter by type"
      />
    </EuiFilterButton>
  );

  const select = (
    id: string,
    selectOptions: Array<{ text: ReactNode } & OptionHTMLAttributes<HTMLOptionElement>>,
    selectValue: string
  ) => {
    return (
      <EuiSelect
        id={`${id}-select`}
        options={selectOptions}
        value={selectValue}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          handleValueChange(id, e.target.value)
        }
        aria-label={i18n.translate('discover.fieldChooser.filter.fieldSelectorLabel', {
          defaultMessage: 'Selection of {id} filter options',
          values: { id },
        })}
        data-test-subj={`${id}Select`}
        compressed
      />
    );
  };

  const toggleButtons = (id: string) => {
    return [
      {
        id: `${id}-any`,
        label: i18n.translate('discover.fieldChooser.filter.toggleButton.any', {
          defaultMessage: 'any',
        }),
      },
      {
        id: `${id}-true`,
        label: i18n.translate('discover.fieldChooser.filter.toggleButton.yes', {
          defaultMessage: 'yes',
        }),
      },
      {
        id: `${id}-false`,
        label: i18n.translate('discover.fieldChooser.filter.toggleButton.no', {
          defaultMessage: 'no',
        }),
      },
    ];
  };

  const buttonGroup = (id: string, legend: string) => {
    return (
      <EuiButtonGroup
        legend={legend}
        options={toggleButtons(id)}
        idSelected={`${id}-${values[id]}`}
        onChange={(optionId: string) => handleValueChange(id, optionId.replace(`${id}-`, ''))}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={`${id}ButtonGroup`}
      />
    );
  };

  const footer = () => {
    return (
      <EuiPopoverFooter paddingSize="s">
        <EuiSwitch
          label={i18n.translate('discover.fieldChooser.filter.hideEmptyFieldsLabel', {
            defaultMessage: 'Hide empty fields',
          })}
          checked={values.missing}
          onChange={handleMissingChange}
          data-test-subj="missingSwitch"
        />
      </EuiPopoverFooter>
    );
  };

  const selectionPanel = (
    <div className="dscFieldSearch__formWrapper">
      <EuiForm data-test-subj="filterSelectionPanel">
        <EuiFormRow fullWidth label={aggregatableLabel} display="columnCompressed">
          {buttonGroup('aggregatable', aggregatableLabel)}
        </EuiFormRow>
        <EuiFormRow fullWidth label={searchableLabel} display="columnCompressed">
          {buttonGroup('searchable', searchableLabel)}
        </EuiFormRow>
        <EuiFormRow fullWidth label={typeLabel} display="columnCompressed">
          {select('type', typeOptions, values.type)}
        </EuiFormRow>
      </EuiForm>
    </div>
  );

  const helpButton = (
    <EuiFilterButton
      grow={false}
      onClick={onHelpClick}
      data-test-subj="fieldTypesHelpButton"
      className="dscFieldTypesHelp__button"
      aria-label="Filter type help"
    >
      <EuiIcon type="iInCircle" color="primary" title="Filter type help" />
    </EuiFilterButton>
  );

  return (
    <React.Fragment>
      <EuiFlexGroup responsive={false} gutterSize={'s'}>
        <EuiFlexItem>
          <EuiFieldSearch
            aria-label={searchPlaceholder}
            data-test-subj="fieldFilterSearchInput"
            fullWidth
            onChange={(event) => onChange('name', event.currentTarget.value)}
            placeholder={searchPlaceholder}
            value={value}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexItem>
        <EuiFilterGroup fullWidth>
          <EuiPopover
            id="dataPanelTypeFilter"
            panelClassName="euiFilterGroup__popoverPanel"
            panelPaddingSize="none"
            anchorPosition="rightUp"
            display="block"
            isOpen={isPopoverOpen}
            closePopover={() => {
              setPopoverOpen(false);
            }}
            button={buttonContent}
          >
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('discover.fieldChooser.filter.filterByTypeLabel', {
                defaultMessage: 'Filter by type',
              })}
            </EuiPopoverTitle>
            {selectionPanel}
            {footer()}
          </EuiPopover>
          <EuiPopover
            anchorPosition="rightUp"
            display="block"
            button={helpButton}
            isOpen={isHelpOpen}
            panelPaddingSize="m"
            className="dscFieldTypesHelp__popover"
            panelClassName="dscFieldTypesHelp__panel"
            closePopover={closeHelp}
          >
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('discover.fieldChooser.popoverTitle', {
                defaultMessage: 'Field types',
              })}
            </EuiPopoverTitle>
            <EuiBasicTable
              tableCaption={i18n.translate('discover.fieldTypesPopover.tableTitle', {
                defaultMessage: 'Description of field types',
              })}
              items={items}
              compressed={true}
              rowHeader="firstName"
              columns={columnsSidebar}
              responsive={false}
            />
            <EuiSpacer size="s" />
            {presentFieldTypes.length > FIELD_TYPES_PER_PAGE && (
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiPagination
                    aria-label={i18n.translate('discover.fieldChooser.paginationAriaLabel', {
                      defaultMessage: 'Field types navigation',
                    })}
                    activePage={curPageIndex}
                    pageCount={totalPages}
                    onPageClick={changePageIndex}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            <EuiPopoverFooter paddingSize="s">
              Learn more about&nbsp;
              <EuiLink href={docLinks.links.discover.fieldTypeHelp}>
                <FormattedMessage
                  id="discover.fieldTypesPopover.learnMore"
                  defaultMessage="field types"
                />
              </EuiLink>
            </EuiPopoverFooter>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
    </React.Fragment>
  );
}
