/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { ALERT_RULE_TYPE_ID, ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/rule-data-utils';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { createSecurityDocumentProfileProvider } from './profile';
import { DocumentType } from '../../..';

const mockServices = createProfileProviderSharedServicesMock();
const provider = createSecurityDocumentProfileProvider(mockServices);

const buildRecord = (fields: Record<string, unknown>): DataTableRecord =>
  ({ flattened: fields, raw: {}, id: 'test-id' } as unknown as DataTableRecord);

const prevDocViewer = () => ({
  title: 'test title',
  docViewsRegistry: (registry: DocViewsRegistry) => registry,
});

const getDocViewerFor = (record: DataTableRecord) => {
  const getDocViewer = provider.profile.getDocViewer!(prevDocViewer, {
    context: { type: DocumentType.Default },
  });
  return getDocViewer({ actions: {}, record } as Parameters<typeof getDocViewer>[0]);
};

describe('createSecurityDocumentProfileProvider — getDocViewer', () => {
  it('registers the overview tab for a regular alert', () => {
    const registry = new DocViewsRegistry();
    const docViewer = getDocViewerFor(buildRecord({ 'event.kind': 'signal' }));
    docViewer.docViewsRegistry(registry);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0]).toMatchObject({
      id: 'doc_view_alerts_overview',
      title: 'Alert Overview',
    });
  });

  it('registers the overview tab for a signal with an unrelated rule type', () => {
    const registry = new DocViewsRegistry();
    const docViewer = getDocViewerFor(
      buildRecord({
        'event.kind': 'signal',
        [ALERT_RULE_TYPE_ID]: 'siem.queryRule',
      })
    );
    docViewer.docViewsRegistry(registry);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0]).toMatchObject({
      id: 'doc_view_alerts_overview',
      title: 'Alert Overview',
    });
  });

  it('registers the overview tab for a non-alert event', () => {
    const registry = new DocViewsRegistry();
    const docViewer = getDocViewerFor(buildRecord({ 'event.kind': 'event' }));
    docViewer.docViewsRegistry(registry);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0]).toMatchObject({
      id: 'doc_view_alerts_overview',
      title: 'Event Overview',
    });
  });

  it('registers the overview tab when event.kind is absent', () => {
    const registry = new DocViewsRegistry();
    const docViewer = getDocViewerFor(buildRecord({}));
    docViewer.docViewsRegistry(registry);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0]).toMatchObject({
      id: 'doc_view_alerts_overview',
      title: 'Event Overview',
    });
  });

  it('does NOT register the overview tab for a scheduled attack discovery alert', () => {
    const registry = new DocViewsRegistry();
    const docViewer = getDocViewerFor(
      buildRecord({
        'event.kind': 'signal',
        [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
      })
    );
    docViewer.docViewsRegistry(registry);
    expect(registry.getAll()).toHaveLength(0);
  });

  it('does NOT register the overview tab for an ad-hoc attack discovery alert', () => {
    const registry = new DocViewsRegistry();
    const docViewer = getDocViewerFor(
      buildRecord({
        'event.kind': 'signal',
        [ALERT_RULE_TYPE_ID]: 'attack_discovery_ad_hoc_rule_type_id',
      })
    );
    docViewer.docViewsRegistry(registry);
    expect(registry.getAll()).toHaveLength(0);
  });
});
