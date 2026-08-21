/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutParallelWorkerFixtures } from '@kbn/scout';
import {
  SAMPLE_DATA_VIEW_NAME,
  SAMPLE_TAG_NAME,
  buildAnnotationGroupAttrs,
  buildSampleDvReferences,
  buildSampleTaggedReferences,
  getSampleDataViewId,
  getSampleTagId,
} from './constants';

type ScoutSpace = ScoutParallelWorkerFixtures['scoutSpace'];

/**
 * Describes a single annotation group to seed via {@link seedAnnotationListing}.
 * `tagged` controls whether the group is associated with the shared sample tag.
 */
export interface AnnotationGroupSeed {
  title: string;
  description?: string;
  tagged?: boolean;
}

export interface SeedAnnotationListingOptions {
  kbnClient: KbnClient;
  scoutSpace: ScoutSpace;
  /** Annotation groups to create. Order isn't significant for any listing assertion. */
  groups: AnnotationGroupSeed[];
  /** When `true`, also creates the shared sample tag referenced by `tagged: true` groups. */
  withTag?: boolean;
}

/**
 * Wipes the standard saved-object list plus any existing `event-annotation-group`s,
 * then seeds the sample data view, an optional sample tag, and the supplied
 * `groups` in the given Scout space.
 *
 * Hoisted out of the two Scout specs so they share one source of truth for the
 * `event-annotation-group` saved-object payloads — the shape of `attributes` /
 * `references` has to stay in lockstep with the CM schema, and that's easier
 * to maintain in a single helper than in two `beforeAll` blocks.
 */
export const seedAnnotationListing = async ({
  kbnClient,
  scoutSpace,
  groups,
  withTag = false,
}: SeedAnnotationListingOptions): Promise<void> => {
  await scoutSpace.savedObjects.cleanStandardList();
  await kbnClient.savedObjects.clean({
    types: ['event-annotation-group'],
    space: scoutSpace.id,
  });

  const dataViewId = getSampleDataViewId(scoutSpace.id);
  const tagId = getSampleTagId(scoutSpace.id);
  const dataViewReferences = buildSampleDvReferences(dataViewId);

  await kbnClient.request({
    method: 'POST',
    path: `/s/${scoutSpace.id}/internal/ftr/kbn_client_so/index-pattern/${dataViewId}`,
    body: {
      attributes: {
        title: SAMPLE_DATA_VIEW_NAME,
        name: SAMPLE_DATA_VIEW_NAME,
        timeFieldName: '@timestamp',
      },
    },
  });

  if (withTag) {
    await kbnClient.request({
      method: 'POST',
      path: `/s/${scoutSpace.id}/internal/ftr/kbn_client_so/tag/${tagId}`,
      body: {
        attributes: {
          name: SAMPLE_TAG_NAME,
          color: '#FFCC33',
          description: '',
        },
      },
    });
  }

  // Groups are independent saved objects with no ordering or reference
  // constraints between them, so post in parallel. The data view (and tag,
  // if requested) are already in place by the time we get here.
  await Promise.all(
    groups.map((group) =>
      kbnClient.request({
        method: 'POST',
        path: `/s/${scoutSpace.id}/internal/ftr/kbn_client_so/event-annotation-group`,
        body: {
          attributes: buildAnnotationGroupAttrs(group),
          references: group.tagged
            ? buildSampleTaggedReferences(dataViewId, tagId)
            : dataViewReferences,
        },
      })
    )
  );
};

/**
 * Inverse of {@link seedAnnotationListing}: removes every annotation group and
 * the standard saved-object list from the given Scout space. The sample data
 * view and tag are owned by the standard list, so they get cleaned alongside.
 */
export const cleanupAnnotationListing = async ({
  kbnClient,
  scoutSpace,
}: Pick<SeedAnnotationListingOptions, 'kbnClient' | 'scoutSpace'>): Promise<void> => {
  await kbnClient.savedObjects.clean({
    types: ['event-annotation-group'],
    space: scoutSpace.id,
  });
  await scoutSpace.savedObjects.cleanStandardList();
};
