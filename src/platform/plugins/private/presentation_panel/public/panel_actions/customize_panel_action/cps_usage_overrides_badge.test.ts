/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PublishesProjectRoutingOverrides,
  ProjectRoutingOverrides,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { CpsUsageOverridesBadge } from './cps_usage_overrides_badge';

describe('CPS usage overrides badge action', () => {
  let action: CpsUsageOverridesBadge;
  let context: { embeddable: PublishesProjectRoutingOverrides };

  let updateOverrides: (overrides: ProjectRoutingOverrides) => void;

  beforeEach(() => {
    const overridesSubject = new BehaviorSubject<ProjectRoutingOverrides>(undefined);
    updateOverrides = (overrides) => overridesSubject.next(overrides);

    action = new CpsUsageOverridesBadge();
    context = {
      embeddable: {
        projectRoutingOverrides$: overridesSubject,
      },
    };
  });

  it('is compatible when embeddable has project routing overrides', async () => {
    updateOverrides([{ value: '_alias:*' }]);
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is compatible when embeddable has multiple project routing overrides', async () => {
    updateOverrides([
      { name: 'Layer 1', value: 'project-a' },
      { name: 'Layer 2', value: 'project-b' },
    ]);
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible when embeddable has no project routing overrides', async () => {
    updateOverrides(undefined);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is incompatible when embeddable has empty array of overrides', async () => {
    updateOverrides([]);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is incompatible when embeddable does not publish project routing overrides', async () => {
    const nonPublishingContext = {
      embeddable: {},
    };
    expect(await action.isCompatible(nonPublishingContext as any)).toBe(false);
  });

  describe('getOverrideValues', () => {
    it('returns override values array for single override', async () => {
      updateOverrides([{ value: '_alias:*' }]);
      expect(await action.isCompatible(context)).toBe(true);
    });

    it('returns override values array for multiple overrides with names', async () => {
      updateOverrides([
        { name: 'Sales Data', value: 'project-a' },
        { name: 'Inventory', value: 'project-b' },
      ]);
      expect(await action.isCompatible(context)).toBe(true);
    });

    it('returns undefined when no overrides present', async () => {
      updateOverrides(undefined);
      expect(await action.isCompatible(context)).toBe(false);
    });
  });
});
