/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createCallerCalleeIntermediateNode,
  fromCallerCalleeIntermediateNode,
} from './callercallee';
import { createStackFrameMetadata, hashFrameGroup } from './profiling';

describe('Caller-callee operations', () => {
  test('1', () => {
    const parentFrame = createStackFrameMetadata({
      FileID: '6bc50d345244d5956f93a1b88f41874d',
      FrameType: 3,
      AddressOrLine: 971740,
      FunctionName: 'epoll_wait',
      SourceID: 'd670b496cafcaea431a23710fb5e4f58',
      SourceLine: 30,
      ExeFileName: 'libc-2.26.so',
      Index: 1,
    });
    const parent = createCallerCalleeIntermediateNode(parentFrame, 10);

    const childFrame = createStackFrameMetadata({
      FileID: '8d8696a4fd51fa88da70d3fde138247d',
      FrameType: 3,
      AddressOrLine: 67000,
      FunctionName: 'epoll_poll',
      SourceID: 'f0a7901dcefed6cc8992a324b9df733c',
      SourceLine: 150,
      ExeFileName: 'auditd',
      Index: 0,
    });
    const child = createCallerCalleeIntermediateNode(childFrame, 10);

    const root = createCallerCalleeIntermediateNode(createStackFrameMetadata(), 10);
    root.callees.set(hashFrameGroup(child.frameGroup), child);
    root.callees.set(hashFrameGroup(parent.frameGroup), parent);

    const graph = fromCallerCalleeIntermediateNode(root);

    // Modify original frames to verify graph does not contain references
    parent.samples = 30;
    child.samples = 20;

    expect(graph.Callees[0].Samples).toEqual(10);
    expect(graph.Callees[1].Samples).toEqual(10);
  });
});
