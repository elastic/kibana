/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import type { ReactNode } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import type { FlyoutBodyProps } from '../types';
import { bodyAssembly, flyoutAssembly } from '../assembly';
import { resolveZoneTestSubj, useFlyoutTemplateConfig } from '../context';

/** Renders passthrough children in source order, routing assembly parse through bodyAssembly. */
const renderBodyItems = (children: ReactNode) => {
  const items = bodyAssembly.parseChildren(children, { supportsOtherChildren: true });
  return items.map((item, index) => {
    if (item.type === 'child') {
      return <Fragment key={`passthrough-${index}`}>{item.node}</Fragment>;
    }
    return null;
  });
};

/** Part name used for identifying the `Body` zone. */
export const BODY_PART_NAME = 'body';

const bodyPart = flyoutAssembly.definePart({ name: BODY_PART_NAME });

/** Declarative `FlyoutTemplate.Body`; the root renders the collected attributes. */
const BaseBody = bodyPart.createComponent<FlyoutBodyProps>();
BaseBody.displayName = 'FlyoutTemplate.Body';

export const Body = BaseBody;

/** Internal renderer for the body zone. */
export const BodyZone = ({ children, 'data-test-subj': dataTestSubj }: FlyoutBodyProps) => {
  const { dataTestSubj: rootTestSubj } = useFlyoutTemplateConfig();

  return (
    <EuiFlyoutBody data-test-subj={resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Body')}>
      {renderBodyItems(children)}
    </EuiFlyoutBody>
  );
};
