/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { EuiText, EuiThemeProvider } from '@elastic/eui';
import { ExistenceFetchStatus } from '../../types';
import { FieldListFilters } from '../field_list_filters';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';
import { useGroupedFields, type GroupedFieldsParams } from '../../hooks/use_grouped_fields';
import FieldListGrouped, { type FieldListGroupedProps } from './field_list_grouped';
import userEvent from '@testing-library/user-event';

interface WrapperProps {
  listProps: Omit<FieldListGroupedProps<DataViewField>, 'fieldGroups'>;
  hookParams: Omit<GroupedFieldsParams<DataViewField>, 'services'>;
}

const DESCRIPTION_ID = 'fieldListGrouped__ariaDescription';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

describe('UnifiedFieldList FieldListGrouped + useGroupedFields()', () => {
  let defaultProps: FieldListGroupedProps<DataViewField>;
  let mockedServices: GroupedFieldsParams<DataViewField>['services'];
  const allFields = dataView.fields;
  // 5 times more fields. Added fields will be treated as Unmapped as they are not a part of the data view.
  const manyFields = [...new Array(5)].flatMap((_, index) =>
    allFields.map(
      (field) => new DataViewField({ ...field.toSpec(), name: `${field.name}${index || ''}` })
    )
  );

  beforeEach(() => {
    const dataViews = dataViewPluginMocks.createStartContract();
    mockedServices = {
      dataViews,
      core: coreMock.createStart(),
    };

    dataViews.get.mockResolvedValue(dataView);

    defaultProps = {
      fieldGroups: {},
      fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      scrollToTopResetCounter: 0,
      fieldsExistInIndex: true,
      screenReaderDescriptionId: 'testId',
      renderFieldItem: jest.fn(({ field, itemIndex, groupIndex }) => (
        <EuiText
          data-test-subj="testFieldItem"
          data-name={`${field.name}-${groupIndex}-${itemIndex}`}
        >
          {field.name}
        </EuiText>
      )),
    };
  });

  const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <EuiThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </EuiThemeProvider>
  );

  const mountGroupedList = async ({ listProps, hookParams }: WrapperProps) => {
    const Wrapper: React.FC<WrapperProps> = (props) => {
      const {
        fieldListFiltersProps,
        fieldListGroupedProps: { fieldGroups },
      } = useGroupedFields({
        ...props.hookParams,
        services: mockedServices,
      });

      return (
        <>
          <FieldListFilters {...fieldListFiltersProps} />
          <FieldListGrouped {...props.listProps} fieldGroups={fieldGroups} />
        </>
      );
    };

    const utils = render(
      <Providers>
        <Wrapper hookParams={hookParams} listProps={listProps} />
      </Providers>
    );

    // wait for lazy modules
    await screen.findByTestId('fieldListFiltersFieldSearch');
    await screen.findByTestId('fieldListGroupedFieldGroups');

    return {
      ...utils,
      rerenderWithProviders: (nextProps: WrapperProps) =>
        utils.rerender(
          <Providers>
            <Wrapper hookParams={nextProps.hookParams} listProps={nextProps.listProps} />
          </Providers>
        ),
    };
  };

  it('renders correctly in empty state', () => {
    render(
      <FieldListGrouped
        {...defaultProps}
        fieldGroups={{}}
        fieldsExistenceStatus={ExistenceFetchStatus.unknown}
      />
    );

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent('');
  });

  it('renders correctly in loading state', async () => {
    const listProps = {
      ...defaultProps,
      fieldsExistenceStatus: ExistenceFetchStatus.unknown,
    };
    const hookParams = {
      dataViewId: dataView.id ?? null,
      allFields,
    };

    const { rerenderWithProviders } = await mountGroupedList({
      listProps,
      hookParams,
    });

    expect(screen.getAllByTestId(/fieldListGrouped.*-countLoading/)).toHaveLength(2);
    expect(screen.getByTestId('fieldListGrouped__ariaDescription')).toHaveTextContent('');
    expect(screen.getAllByTestId(/^fieldListGrouped(Available|Meta)Fields$/)).toHaveLength(2);
    expect(screen.queryAllByTestId(/NoFieldsCallout/)).toHaveLength(0);

    rerenderWithProviders({
      listProps: {
        ...listProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams,
    });

    expect(screen.getByText('25 available fields. 3 meta fields.')).toBeVisible();
    expect(screen.queryAllByTestId(/-countLoading$/)).toHaveLength(0);
    expect(screen.getAllByTestId(/^fieldListGrouped(Available|Meta)Fields$/)).toHaveLength(2);
    expect(screen.getAllByTestId(/fieldListGrouped(Available|Meta)Fields-count$/)).toHaveLength(2);
    expect(screen.getAllByTestId('testFieldItem')).toHaveLength(25);
    expect(screen.queryAllByTestId(/NoFieldsCallout/)).toHaveLength(0);
  });

  it('renders correctly in failed state', async () => {
    await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.failed,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields,
      },
    });

    expect(screen.getByText('25 available fields. 3 meta fields.')).toBeVisible();
    expect(screen.queryAllByTestId(/-countLoading$/)).toHaveLength(0);
    expect(screen.getAllByTestId(/^fieldListGrouped(Available|Meta)Fields$/)).toHaveLength(2);
    expect(screen.getAllByText('Existence fetch failed')).toHaveLength(2);
  });

  it('renders correctly in no fields state', async () => {
    await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistInIndex: false,
        fieldsExistenceStatus: ExistenceFetchStatus.failed,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields: [],
      },
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '0 available fields. 0 meta fields.'
    );
    expect(screen.getAllByTestId(/^fieldListGrouped(Available|Meta)Fields$/)).toHaveLength(2);
    expect(screen.queryAllByTestId(/-countLoading$/)).toHaveLength(0);
    expect(screen.getAllByText('No fields exist in this data view.')).toHaveLength(2);
  });

  it('renders correctly for text-based queries (no data view)', async () => {
    await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams: {
        dataViewId: null,
        allFields,
        onSelectedFieldFilter: (field) => field.name === 'bytes',
      },
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '1 selected field. 28 available fields.'
    );

    const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');
    const selectedFields = screen.getByTestId('fieldListGroupedSelectedFields');
    expect(within(availableFields).getAllByTestId('testFieldItem')).toHaveLength(28);
    expect(within(selectedFields).getAllByTestId('testFieldItem')).toHaveLength(1);
  });

  it('renders correctly when Meta gets open', async () => {
    const user = userEvent.setup();

    await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields,
      },
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '25 available fields. 3 meta fields.'
    );
    const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');
    const metaFields = screen.getByTestId('fieldListGroupedMetaFields');
    expect(within(availableFields).getAllByTestId('testFieldItem')).toHaveLength(25);
    expect(within(metaFields).queryAllByTestId('testFieldItem')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /meta fields/i }));

    expect(within(availableFields).getAllByTestId('testFieldItem')).toHaveLength(25);
    expect(within(metaFields).getAllByTestId('testFieldItem')).toHaveLength(3);
  });

  it('renders correctly when paginated', async () => {
    const user = userEvent.setup();

    await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields: manyFields,
      },
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '25 available fields. 112 unmapped fields. 3 meta fields.'
    );

    const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');
    const unmappedFields = screen.getByTestId('fieldListGroupedUnmappedFields');
    const metaFields = screen.getByTestId('fieldListGroupedMetaFields');
    expect(within(availableFields).getAllByTestId('testFieldItem')).toHaveLength(25);
    expect(within(unmappedFields).queryAllByTestId('testFieldItem')).toHaveLength(0);
    expect(within(metaFields).queryAllByTestId('testFieldItem')).toHaveLength(0);
    expect(
      screen.getByText("Fields that aren't explicitly mapped to a field data type.")
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: /unmapped fields/i }));

    expect(within(availableFields).getAllByTestId('testFieldItem')).toHaveLength(25);
    expect(within(unmappedFields).getAllByTestId('testFieldItem')).toHaveLength(50);
    expect(within(metaFields).queryAllByTestId('testFieldItem')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /meta fields/i }));

    expect(within(availableFields).getAllByTestId('testFieldItem')).toHaveLength(25);
    expect(within(unmappedFields).getAllByTestId('testFieldItem')).toHaveLength(88);
    expect(within(metaFields).queryAllByTestId('testFieldItem')).toHaveLength(0);
  });

  it('renders correctly when fields are searched and filtered', async () => {
    const user = userEvent.setup();

    await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields: manyFields,
      },
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '25 available fields. 112 unmapped fields. 3 meta fields.'
    );

    const searchInput = screen.getByTestId('fieldListFiltersFieldSearch') as HTMLInputElement;
    await user.type(searchInput, '@');

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '2 available fields. 8 unmapped fields. 0 meta fields.'
    );

    await user.type(searchInput, '_', {
      initialSelectionStart: 0,
      initialSelectionEnd: searchInput.value.length,
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '3 available fields. 24 unmapped fields. 3 meta fields.'
    );

    await user.click(screen.getByTestId('fieldListFiltersFieldTypeFilterToggle'));
    await user.click(screen.getByTestId('typeFilter-date'));

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '1 available field. 4 unmapped fields. 0 meta fields.'
    );
  });

  it('renders correctly when non-supported fields are filtered out', async () => {
    const hookParams = {
      dataViewId: dataView.id!,
      allFields: manyFields,
    };
    const listProps = {
      ...defaultProps,
      fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
    };

    const { rerenderWithProviders } = await mountGroupedList({
      listProps,
      hookParams,
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '25 available fields. 112 unmapped fields. 3 meta fields.'
    );

    rerenderWithProviders({
      listProps,
      hookParams: {
        ...hookParams,
        onSupportedFieldFilter: (field: DataViewField) => field.aggregatable,
      },
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '23 available fields. 104 unmapped fields. 3 meta fields.'
    );
  });

  it('renders correctly when selected fields are present', async () => {
    const hookParams = {
      dataViewId: dataView.id!,
      allFields: manyFields,
    };
    const listProps = {
      ...defaultProps,
      fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
    };

    const { rerenderWithProviders } = await mountGroupedList({
      listProps,
      hookParams,
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '25 available fields. 112 unmapped fields. 3 meta fields.'
    );

    rerenderWithProviders({
      listProps,
      hookParams: {
        ...hookParams,
        onSelectedFieldFilter: (field: DataViewField) =>
          ['@timestamp', 'bytes'].includes(field.name),
      },
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '2 selected fields. 25 available fields. 112 unmapped fields. 3 meta fields.'
    );
  });

  it('renders correctly when popular fields limit and custom selected fields are present', async () => {
    const hookParams = {
      dataViewId: dataView.id!,
      allFields: manyFields,
      popularFieldsLimit: 10,
      sortedSelectedFields: [manyFields[0], manyFields[1]],
    };

    await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams,
    });

    expect(screen.getByTestId(DESCRIPTION_ID)).toHaveTextContent(
      '2 selected fields. 10 popular fields. 25 available fields. 112 unmapped fields. 3 meta fields.'
    );
  });

  describe('Skip Link Functionality', () => {
    it('renders the skip link when there is a next section', async () => {
      await mountGroupedList({
        listProps: {
          ...defaultProps,
          fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
        },
        hookParams: {
          dataViewId: dataView.id!,
          allFields,
        },
      });

      // Check that the first accordion (Available Fields) has a skip link
      const availableFieldsAccordion = screen.getByTestId('fieldListGroupedAvailableFields');
      const skipLinks = within(availableFieldsAccordion).getAllByRole('link', {
        name: /go to meta fields/i,
      });

      // Since we have multiple sections, we should have at least one skip link
      expect(skipLinks.length).toBe(1);
    });

    it('does not render a skip link in the last section', async () => {
      await mountGroupedList({
        listProps: {
          ...defaultProps,
          fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
        },
        hookParams: {
          dataViewId: dataView.id!,
          allFields,
        },
      });

      // Find the last accordion (should be Meta Fields)
      const metaFieldsAccordion = screen.getByTestId('fieldListGroupedMetaFields');

      // The last section shouldn't have a skip link
      const skipLinksInLastAccordion = within(metaFieldsAccordion).queryAllByRole('link', {
        name: /go to/i,
      });

      expect(skipLinksInLastAccordion.length).toBe(0);
    });

    it('sets focus on the next section when skip link is clicked', async () => {
      const user = userEvent.setup();

      await mountGroupedList({
        listProps: {
          ...defaultProps,
          fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
        },
        hookParams: {
          dataViewId: dataView.id!,
          allFields,
        },
      });

      // Find the skip link in the Available Fields accordion
      const availableFieldsAccordion = screen.getByTestId('fieldListGroupedAvailableFields');
      const skipLink = within(availableFieldsAccordion).getByRole('link', {
        name: /go to meta fields/i,
      });

      // Click the skip link
      await user.click(skipLink);

      // Verify that the Meta Fields accordion is now focused
      const metaFieldsButton = screen.getByRole('button', { name: /meta fields/i });
      expect(metaFieldsButton).toHaveFocus();
    });
  });

  it('persists sections state in local storage', async () => {
    const user = userEvent.setup();

    const listProps = {
      ...defaultProps,
      fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      localStorageKeyPrefix: 'test',
    };
    const hookParams = {
      dataViewId: dataView.id!,
      allFields: manyFields,
    };

    const { unmount } = await mountGroupedList({
      listProps,
      hookParams,
    });

    const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');
    expect(availableFields).toHaveClass('euiAccordion-isOpen');

    // only Available is open
    await user.click(screen.getByRole('button', { name: /meta fields/i }));

    // now Meta is open too
    const metaFields = screen.getByTestId('fieldListGroupedMetaFields');
    expect(metaFields).toHaveClass('euiAccordion-isOpen');

    unmount();

    await mountGroupedList({
      listProps,
      hookParams,
    });

    // both Available and Empty are open for the second instance
    const availableFields2 = screen.getByTestId('fieldListGroupedAvailableFields');
    expect(availableFields2).toHaveClass('euiAccordion-isOpen');
    const metaFields2 = screen.getByTestId('fieldListGroupedMetaFields');
    expect(metaFields2).toHaveClass('euiAccordion-isOpen');
  });
});
