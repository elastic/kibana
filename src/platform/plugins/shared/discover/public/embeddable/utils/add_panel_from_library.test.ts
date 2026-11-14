/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { addPanelFromLibrary } from './add_panel_from_library';

type OnAddParams = Parameters<typeof addPanelFromLibrary>;

describe('addPanelFromLibrary', () => {
  it('pins the first tab of the Discover session', async () => {
    const addNewPanel = jest.fn().mockResolvedValue({ uuid: 'panel-1' });
    const container = { addNewPanel } as unknown as OnAddParams[0];
    const savedObject = {
      id: 'session-1',
      attributes: {
        tabs: [
          { id: 'tab-1', label: 'Tab 1', attributes: {} },
          { id: 'tab-2', label: 'Tab 2', attributes: {} },
        ],
      },
    } as unknown as OnAddParams[1];

    await addPanelFromLibrary(container, savedObject);

    expect(addNewPanel).toHaveBeenCalledWith(
      {
        panelType: SEARCH_EMBEDDABLE_TYPE,
        serializedState: { ref_id: 'session-1', selected_tab_id: 'tab-1', overrides: {} },
      },
      { displaySuccessMessage: true }
    );
  });
});
