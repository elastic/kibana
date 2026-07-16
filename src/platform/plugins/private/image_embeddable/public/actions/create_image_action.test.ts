/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import { createImageAction } from './create_image_action';

const mockGetAddPanelButton = jest.fn();
jest.mock('@kbn/presentation-util', () => ({
  getAddPanelButton: () => mockGetAddPanelButton(),
  openLazyFlyout: jest.fn(),
}));

jest.mock('../services/kibana_services', () => ({
  coreServices: {},
}));

describe('createImageAction', () => {
  it('returns focus to Add when the image editor closes', async () => {
    await createImageAction.execute({
      embeddable: { addNewPanel: jest.fn() },
    } as unknown as EmbeddableApiContext);

    const [{ flyoutProps }] = jest.mocked(openLazyFlyout).mock.calls[0];
    const { getReturnFocusTarget } = flyoutProps as {
      getReturnFocusTarget?: () => Element | null;
    };
    const addButton = document.createElement('button');
    addButton.id = 'dashboardAddTopNavButton';
    document.body.appendChild(addButton);
    mockGetAddPanelButton.mockReturnValue(addButton);

    expect(getReturnFocusTarget?.()).toBe(addButton);
    addButton.remove();
  });
});
