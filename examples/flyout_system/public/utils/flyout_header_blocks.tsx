/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHealth, EuiLink } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';

/**
 * Shared header block content.
 * Returned as arrays to preserve direct parent-child relationship with FlyoutTemplate.Header.
 */

/** Includes a link to test focus in the collapsible region. */
const metaBlocks = () => [
  <FlyoutTemplate.Header.MetaBlock key="updated" id="updated" title="Last updated">
    Dec 3, 2025
  </FlyoutTemplate.Header.MetaBlock>,
  <FlyoutTemplate.Header.MetaBlock key="updatedBy" id="updatedBy" title="Last updated by">
    <EuiLink href="#" data-test-subj="flyoutMetaBlockLink">
      long-user-name-with-ellipsis@elastic.co
    </EuiLink>
  </FlyoutTemplate.Header.MetaBlock>,
  <FlyoutTemplate.Header.MetaBlock key="owner" id="owner" title="Owner">
    Platform
  </FlyoutTemplate.Header.MetaBlock>,
];

/** Renders enough badges to trigger the '+X more' overflow popover and test truncation. */
const badges = () => [
  <FlyoutTemplate.Header.Badge key="type" id="type" iconType="warning" color="default">
    Type
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="urgency" id="urgency" color="warning">
    Urgency
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta1" id="meta1" color="hollow">
    Metadata 1 very very very very very very long label
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta2" id="meta2" color="hollow">
    Metadata 2
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta3" id="meta3" color="hollow">
    Metadata 3 very very very very long label
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta4" id="meta4" color="hollow">
    Metadata 4
  </FlyoutTemplate.Header.Badge>,
];

/** Renders enough info blocks to fill the grid and make the header collapsible. */
const infoBlocks = () => [
  <FlyoutTemplate.Header.InfoBlock key="owner" id="owner" title="Owner">
    Platform
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="latency" id="latency" title="Latency">
    <EuiHealth color="success">Healthy</EuiHealth>
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="throughput" id="throughput" title="Throughput">
    1.2k tpm
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="risk" id="risk" title="Risk score" size="xl" color="danger">
    90
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="env" id="env" title="Environment">
    global.prod.long-environment-name-with-ellipsis.elastic.co
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="version" id="version" title="Version">
    2.4.1
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="region" id="region" title="Region">
    us-east-1
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="uptime" id="uptime" title="Uptime">
    99.9%
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="lastSeen" id="lastSeen" title="Last seen">
    2m ago
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="errors" id="errors" title="Errors" color="warning">
    12
  </FlyoutTemplate.Header.InfoBlock>,
];

/** Combines all header blocks. */
export const headerBlocks = () => [...metaBlocks(), ...badges(), ...infoBlocks()];
