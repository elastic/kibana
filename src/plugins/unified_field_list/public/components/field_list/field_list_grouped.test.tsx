/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { ReactWrapper } from 'enzyme';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import FieldListGrouped, { type FieldListGroupedProps } from './field_list_grouped';
import { ExistenceFetchStatus } from '../../types';
import { FieldsAccordion } from './fields_accordion';
import { NoFieldsCallout } from './no_fields_callout';
import { useGroupedFields, type GroupedFieldsParams } from '../../hooks/use_grouped_fields';

describe('UnifiedFieldList <FieldListGrouped />', () => {
  let defaultProps: FieldListGroupedProps<DataViewField>;
  let mockedServices: GroupedFieldsParams<DataViewField>['services'];
  const allFields = dataView.fields;

  beforeEach(() => {
    const dataViews = dataViewPluginMocks.createStartContract();
    mockedServices = {
      dataViews,
    };

    dataViews.get.mockImplementation(async (id: string) => {
      return dataView;
    });

    defaultProps = {
      fieldGroups: {},
      fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      existFieldsInIndex: true,
      screenReaderDescriptionForSearchInputId: 'testId',
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

  interface WrapperProps {
    listProps: Omit<FieldListGroupedProps<DataViewField>, 'fieldGroups'>;
    hookParams: Omit<GroupedFieldsParams<DataViewField>, 'services'>;
  }

  async function mountGroupedList({ listProps, hookParams }: WrapperProps): Promise<ReactWrapper> {
    const Wrapper: React.FC<WrapperProps> = (props) => {
      const { fieldGroups } = useGroupedFields({
        ...props.hookParams,
        services: mockedServices,
      });

      return <FieldListGrouped {...props.listProps} fieldGroups={fieldGroups} />;
    };

    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<Wrapper hookParams={hookParams} listProps={listProps} />);
      // wait for lazy modules if any
      await new Promise((resolve) => setTimeout(resolve, 0));
      await wrapper.update();
    });

    return wrapper!;
  }

  it('renders correctly in empty state', () => {
    const wrapper = mountWithIntl(
      <FieldListGrouped
        {...defaultProps}
        fieldGroups={{}}
        fieldsExistenceStatus={ExistenceFetchStatus.unknown}
      />
    );

    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('');
  });

  it('renders correctly in loading state', async () => {
    const wrapper = await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.unknown,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields,
      },
    });

    expect(wrapper.find(FieldListGrouped).prop('fieldsExistenceStatus')).toBe(
      ExistenceFetchStatus.unknown
    );
    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('');
    expect(wrapper.find(FieldsAccordion)).toHaveLength(3);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(3);
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('hasLoaded'))
    ).toStrictEqual([false, false, false]);
    expect(wrapper.find(NoFieldsCallout)).toHaveLength(0);

    await act(async () => {
      await wrapper.setProps({
        listProps: {
          ...defaultProps,
          fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
        },
      });
      await wrapper.update();
    });

    expect(wrapper.find(FieldListGrouped).prop('fieldsExistenceStatus')).toBe(
      ExistenceFetchStatus.succeeded
    );
    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('25 available fields. 0 empty fields. 3 meta fields.');
    expect(wrapper.find(FieldsAccordion)).toHaveLength(3);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('hasLoaded'))
    ).toStrictEqual([true, true, true]);
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('paginatedFields').length)
    ).toStrictEqual([25, 0, 0]);
    expect(wrapper.find(NoFieldsCallout)).toHaveLength(1);
  });

  it('renders correctly in failed state', async () => {
    const wrapper = await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.failed,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields,
      },
    });

    expect(wrapper.find(FieldListGrouped).prop('fieldsExistenceStatus')).toBe(
      ExistenceFetchStatus.failed
    );
    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('25 available fields. 0 empty fields. 3 meta fields.');
    expect(wrapper.find(FieldsAccordion)).toHaveLength(3);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('hasLoaded'))
    ).toStrictEqual([true, true, true]);
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('showExistenceFetchError'))
    ).toStrictEqual([true, true, true]);
  });

  it('renders correctly in no fields state', async () => {
    const wrapper = await mountGroupedList({
      listProps: {
        ...defaultProps,
        existFieldsInIndex: false,
        fieldsExistenceStatus: ExistenceFetchStatus.failed,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields: [],
      },
    });

    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('0 available fields. 0 empty fields. 0 meta fields.');
    expect(wrapper.find(FieldsAccordion)).toHaveLength(3);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(
      wrapper.find(NoFieldsCallout).map((callout) => callout.prop('existFieldsInIndex'))
    ).toStrictEqual([false, false, false]);
  });

  it('renders correctly for text-based queries (no data view)', async () => {
    const wrapper = await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams: {
        dataViewId: null,
        allFields,
      },
    });

    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('28 available fields. 0 empty fields. 0 meta fields.');
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('paginatedFields').length)
    ).toStrictEqual([28, 0, 0]);
  });

  it('renders correctly when Meta gets open', async () => {
    const wrapper = await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams: {
        dataViewId: dataView.id!,
        allFields,
      },
    });

    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('25 available fields. 0 empty fields. 3 meta fields.');
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('paginatedFields').length)
    ).toStrictEqual([25, 0, 0]);

    await act(async () => {
      await wrapper
        .find('[data-test-subj="fieldListGroupedMetaFields"]')
        .find('button')
        .first()
        .simulate('click');
      await wrapper.update();
    });

    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('paginatedFields').length)
    ).toStrictEqual([25, 0, 3]);
  });

  it('renders correctly when paginated', async () => {
    const wrapper = await mountGroupedList({
      listProps: {
        ...defaultProps,
        fieldsExistenceStatus: ExistenceFetchStatus.succeeded,
      },
      hookParams: {
        dataViewId: dataView.id!,
        // 5 times more fields. Added fields will be treated as empty as they are not a part of the data view.
        allFields: [...new Array(5)].flatMap((_, index) =>
          allFields.map((field) => {
            return new DataViewField({ ...field.toSpec(), name: `${field.name}${index || ''}` });
          })
        ),
      },
    });

    expect(
      wrapper.find(`#${defaultProps.screenReaderDescriptionForSearchInputId}`).first().text()
    ).toBe('25 available fields. 112 empty fields. 3 meta fields.');
    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('paginatedFields').length)
    ).toStrictEqual([25, 0, 0]);

    await act(async () => {
      await wrapper
        .find('[data-test-subj="fieldListGroupedEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');
      await wrapper.update();
    });

    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('paginatedFields').length)
    ).toStrictEqual([25, 50, 0]);

    await act(async () => {
      await wrapper
        .find('[data-test-subj="fieldListGroupedMetaFields"]')
        .find('button')
        .first()
        .simulate('click');
      await wrapper.update();
    });

    expect(
      wrapper.find(FieldsAccordion).map((accordion) => accordion.prop('paginatedFields').length)
    ).toStrictEqual([25, 88, 0]);
  });
});
