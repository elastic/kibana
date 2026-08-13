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

jest.mock('@kbn/presentation-util', () => ({
  openLazyFlyout: jest.fn(),
}));

jest.mock('../services/kibana_services', () => ({
  coreServices: {},
}));

describe('createImageAction', () => {
  it('returns focus to Add when the image editor closes', async () => {
    const returnFocus = jest.fn();
    await createImageAction.execute({
      embeddable: { addNewPanel: jest.fn() },
      returnFocus,
    } as unknown as EmbeddableApiContext);

    expect(openLazyFlyout).toHaveBeenCalledWith(expect.objectContaining({ returnFocus }));
  });
});
