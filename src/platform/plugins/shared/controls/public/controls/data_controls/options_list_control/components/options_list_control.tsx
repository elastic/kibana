/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ControlRendererDefault } from './control_renderer_default';
import { useOptionsListContext } from '../options_list_context_provider';
import { ControlRendererUsers } from './control_renderer_users';

export const OptionsListControl = ({
  disableMultiValueEmptySelection = false,
}: {
  disableMultiValueEmptySelection?: boolean;
}) => {
  const { componentApi } = useOptionsListContext();
  const isAssigneeField =
    componentApi.fieldName$.getValue() === 'kibana.alert.workflow_assignee_ids';

  if (isAssigneeField) {
    return <ControlRendererUsers />;
  }

  return (
    <ControlRendererDefault disableMultiValueEmptySelection={disableMultiValueEmptySelection} />
  );
};
