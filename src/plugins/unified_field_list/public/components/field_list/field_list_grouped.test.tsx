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
import { type DataViewField } from '@kbn/data-views-plugin/common';
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
      renderFieldItem: ({ field }) => (
        <EuiText data-test-subj="testFieldItem">{field.name}</EuiText>
      ),
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
    expect(wrapper.find(NoFieldsCallout)).toHaveLength(1);
  });
});
