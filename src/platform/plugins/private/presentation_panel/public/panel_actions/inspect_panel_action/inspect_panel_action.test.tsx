/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TracksOverlays } from '@kbn/presentation-containers';
import { inspector } from '../../kibana_services';
import { InspectPanelActionApi, InspectPanelAction } from './inspect_panel_action';

describe('Inspect panel action', () => {
  let action: InspectPanelAction;
  let context: { embeddable: InspectPanelActionApi };

  beforeEach(() => {
    action = new InspectPanelAction();
    context = {
      embeddable: {
        getInspectorAdapters: jest.fn().mockReturnValue({
          filters: `My filters are extremely interesting. Please inspect them.`,
        }),
      },
    };
  });

  it('is incompatible when context lacks necessary functions', async () => {
    const emptyContext = {
      embeddable: {},
    };
    expect(await action.isCompatible(emptyContext)).toBe(false);
  });

  it('is compatible when inspector adapters are available', async () => {
    inspector.isAvailable = jest.fn().mockReturnValue(true);

    expect(await action.isCompatible(context)).toBe(true);
    expect(inspector.isAvailable).toHaveBeenCalledTimes(1);
    expect(inspector.isAvailable).toHaveBeenCalledWith({
      filters: expect.any(String),
    });
  });

  it('is not compatible when inspector adapters are not available', async () => {
    inspector.isAvailable = jest.fn().mockReturnValue(false);

    expect(await action.isCompatible(context)).toBe(false);
    expect(inspector.isAvailable).toHaveBeenCalledTimes(1);
    expect(inspector.isAvailable).toHaveBeenCalledWith({
      filters: expect.any(String),
    });
  });

  test('Executes when inspector adapters are available', async () => {
    inspector.isAvailable = jest.fn().mockReturnValue(true);
    inspector.open = jest.fn().mockReturnValue({ onClose: Promise.resolve(undefined) });

    expect(inspector.open).toHaveBeenCalledTimes(0);

    await action.execute(context);

    expect(inspector.open).toHaveBeenCalledTimes(1);
  });

  it('opens overlay on parent if parent is an overlay tracker', async () => {
    inspector.open = jest.fn().mockReturnValue({ onClose: Promise.resolve(undefined) });
    context.embeddable.parentApi = {
      openOverlay: jest.fn(),
      clearOverlays: jest.fn(),
    };
    await action.execute(context);
    expect((context.embeddable.parentApi as TracksOverlays).openOverlay).toHaveBeenCalled();
  });
});
