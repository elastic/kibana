/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { VEGA_EMBEDDABLE_TYPE, VEGA_SAVED_OBJECT_TYPE } from '../../common/constants';
import { registerVegaAddFromLibrary } from './register_vega_add_from_library';

describe('registerVegaAddFromLibrary', () => {
  it('adds library items as by-reference panels', async () => {
    const embeddable = embeddablePluginMock.createSetupContract();

    registerVegaAddFromLibrary(embeddable);

    expect(embeddable.registerAddFromLibraryType).toHaveBeenCalledWith(
      expect.objectContaining({ savedObjectType: VEGA_SAVED_OBJECT_TYPE })
    );
    const { onAdd } = jest.mocked(embeddable.registerAddFromLibraryType).mock.calls[0][0];
    const container = { addNewPanel: jest.fn() };
    await onAdd(
      container as unknown as Parameters<typeof onAdd>[0],
      { id: 'item-1' } as Parameters<typeof onAdd>[1]
    );
    expect(container.addNewPanel).toHaveBeenCalledWith(
      { panelType: VEGA_EMBEDDABLE_TYPE, serializedState: { ref_id: 'item-1' } },
      { displaySuccessMessage: true }
    );
  });
});
