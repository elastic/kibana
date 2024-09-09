/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';

import { EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { SearchExample } from './control_group_renderer_examples/search_example';
import { EditExample } from './control_group_renderer_examples/edit_example';
import { BasicReduxExample } from './control_group_renderer_examples/basic_redux_example';
import { AddButtonExample } from './control_group_renderer_examples/add_button_example';
import { ControlsExampleStartDeps } from '../plugin';

export const ControlGroupRendererExamples = ({
  data,
  navigation,
}: Pick<ControlsExampleStartDeps, 'data' | 'navigation'>) => {
  const {
    loading,
    value: dataViews,
    error,
  } = useAsync(async () => {
    return await data.dataViews.find('kibana_sample_data_logs');
  }, []);

  if (loading) return <EuiLoadingSpinner />;

  return dataViews && dataViews.length > 0 && !error ? (
    <>
      <SearchExample dataView={dataViews[0]} navigation={navigation} data={data} />
      <EuiSpacer size="xl" />
      <EditExample />
      <EuiSpacer size="xl" />
      <BasicReduxExample dataViewId={dataViews[0].id!} />
      <EuiSpacer size="xl" />
      <AddButtonExample dataViewId={dataViews[0].id!} />
    </>
  ) : (
    <EuiText>{'Install web logs sample data to run controls examples.'}</EuiText>
  );
};
