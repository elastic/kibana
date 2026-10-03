/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { useDiscoverServices } from './use_discover_services';
import { useDataViewFieldEditor } from './use_data_view_field_editor';

jest.mock('./use_discover_services');
jest.mock('../application/main/state_management/redux', () => ({
  useCurrentTabSelector: () => 'tab-id',
}));

const openDeleteModal = async () => {
  const services = createDiscoverServicesMock();
  jest.mocked(useDiscoverServices).mockReturnValue(services);
  jest.mocked(services.dataViewFieldEditor.openDeleteModal).mockResolvedValue(jest.fn());
  const source = new DataView({
    spec: { id: 'source', title: 'logs-*' },
    fieldFormats: services.fieldFormats,
  });
  const draft = new DataView({ spec: source.toSpec(), fieldFormats: services.fieldFormats });
  const confirmed = new DataView({
    spec: { id: 'confirmed', title: 'logs-*' },
    fieldFormats: services.fieldFormats,
  });
  const session = {
    draft: Promise.resolve(draft),
    commit: jest.fn().mockResolvedValue(confirmed),
    dispose: jest.fn(),
  };
  jest.spyOn(services.inlineDataViews, 'beginEdit').mockReturnValue(session);
  const onFieldEdited = jest.fn();
  const { result } = renderHook(() => useDataViewFieldEditor({ dataView: source, onFieldEdited }));
  result.current.deleteField('runtime_field');
  await waitFor(() => expect(services.dataViewFieldEditor.openDeleteModal).toHaveBeenCalled());
  const [options] = jest.mocked(services.dataViewFieldEditor.openDeleteModal).mock.calls[0];

  return { services, session, source, draft, confirmed, options, onFieldEdited };
};

describe('useDataViewFieldEditor deletion', () => {
  it('opens on the session draft and applies the confirmed view and removed field name', async () => {
    const { services, session, source, draft, confirmed, options, onFieldEdited } =
      await openDeleteModal();

    expect(services.inlineDataViews.beginEdit).toHaveBeenCalledWith(source);
    expect(options.ctx.dataView).toBe(draft);
    expect(options.fieldName).toBe('runtime_field');
    await options.onDelete?.(['runtime_field']);

    expect(session.commit).toHaveBeenCalledWith(undefined);
    expect(onFieldEdited).toHaveBeenCalledWith({
      editedDataView: confirmed,
      removedFieldName: 'runtime_field',
    });
  });

  it('disposes without committing when the modal is cancelled', async () => {
    const { session, options, onFieldEdited } = await openDeleteModal();

    options.onCancel?.();

    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(session.commit).not.toHaveBeenCalled();
    expect(onFieldEdited).not.toHaveBeenCalled();
  });
});
