/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { ReplacementCard as ConnectedComponent } from './replacement_card';
import { ReplacementCard as Component } from './replacement_card.component';

export default {
  title: 'Replacement Card',
  description: '',
  decorators: [
    (storyFn: any) => (
      <div style={{ padding: 40, backgroundColor: '#fff', width: 350 }}>{storyFn()}</div>
    ),
  ],
};

export function ReplacementCard() {
  return <ConnectedComponent eprOverlap="nginx" />;
}

export function ReplacementCardComponent() {
  return <Component replacements={[]} />;
}
