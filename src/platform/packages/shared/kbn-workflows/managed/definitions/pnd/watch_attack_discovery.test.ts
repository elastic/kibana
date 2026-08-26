/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import WATCH_ATTACK_DISCOVERY_YAML from './watch_attack_discovery.yaml';

describe('Attack Discovery worker', () => {
  it('requests and propagates structured recommended actions', () => {
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('name: recommend_actions');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('skill://recommended-actions');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      'steps.recommend_actions.output.structured_output.recommended_actions'
    );
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      'recommended_actions: "${{ variables.recommended_actions }}"'
    );
  });

  it('renders both execution classes in each investigation', () => {
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('"Kibana-executable"');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('"Manual analyst actions"');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      '{{ steps.recommend_actions.output.structured_output.recommended_actions | json }}'
    );
  });
});
