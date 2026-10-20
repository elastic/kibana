/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Static `branches` parallel step: a fixed set of named, heterogeneous branches
 * that run concurrently. Each branch here has a single console step, so the
 * execution tree collapses each branch into its step row labeled with the
 * branch name (`virustotal`, `geoip`). A downstream step runs after the join.
 */
export const getStaticBranchesParallelWorkflowYaml = (name: string) => `
name: ${name}
enabled: false
description: Parallel step with static branches
triggers:
  - type: manual
steps:
  - name: enrich
    type: parallel
    branches:
      - name: virustotal
        steps:
          - name: scan_hash
            type: console
            with:
              message: "scanning hash"
      - name: geoip
        steps:
          - name: geo_lookup
            type: console
            with:
              message: "looking up geo"
  - name: after_join
    type: console
    with:
      message: "branches joined"
`;

/**
 * Dynamic fan-out parallel step: the `steps` body runs once per `foreach` item,
 * concurrently. With three items the execution tree shows three iterations under
 * the parallel node, each running the same branch body.
 */
export const getForeachFanOutParallelWorkflowYaml = (name: string) => `
name: ${name}
enabled: false
description: Parallel step with dynamic foreach fan-out
triggers:
  - type: manual
consts:
  items: ["a", "b", "c"]
steps:
  - name: fan_out
    type: parallel
    foreach: "{{ consts.items }}"
    steps:
      - name: process_item
        type: console
        with:
          message: "processing {{ foreach.item }}"
  - name: after_fan_out
    type: console
    with:
      message: "fan-out joined"
`;
