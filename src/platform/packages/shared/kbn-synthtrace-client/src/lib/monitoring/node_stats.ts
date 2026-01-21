/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields } from '../entity';
import { Serializable } from '../serializable';

export interface NodeStatsDocument extends Fields {
  type: 'node_stats';
  cluster_uuid: string;
  timestamp: string;
  'source_node.uuid': string;
  'source_node.name': string;
  'source_node.transport_address'?: string;
  'node_stats.node_id': string;
  'node_stats.fs.total.total_in_bytes'?: number;
  'node_stats.fs.total.available_in_bytes'?: number;
  'node_stats.fs.total.available_in_byhtes'?: number; // Typo for backwards compatibility
  'node_stats.process.cpu.percent'?: number;
  'node_stats.jvm.mem.heap_used_percent'?: number;
  'node_stats.jvm.mem.heap_max_in_bytes'?: number;
  'node_stats.indices.docs.count'?: number;
  'node_stats.indices.store.size_in_bytes'?: number;
  _index?: string; // For routing to the correct Elasticsearch index
}

export class NodeStats extends Serializable<NodeStatsDocument> {
  constructor(fields: NodeStatsDocument) {
    super(fields);

    this.fields.type = 'node_stats';
    // this.fields.timestamp = new Date().toISOString();
    this.fields._index = '.monitoring-es-8'; // Set the target index for routing
  }

  timestamp(timestamp: number) {
    super.timestamp(timestamp);
    this.fields.timestamp = new Date(timestamp).toISOString();
    return this;
  }

  /**
   * Set filesystem stats for the node
   * @param availableBytes - Available disk space in bytes
   * @param totalBytes - Total disk space in bytes
   */
  fsStats(availableBytes: number, totalBytes?: number) {
    this.fields['node_stats.fs.total.available_in_bytes'] = availableBytes;
    // Add the typo version for backwards compatibility with the query
    this.fields['node_stats.fs.total.available_in_byhtes'] = availableBytes;
    if (totalBytes !== undefined) {
      this.fields['node_stats.fs.total.total_in_bytes'] = totalBytes;
    }
    return this;
  }

  /**
   * Set CPU usage percentage
   */
  cpuPercent(percent: number) {
    this.fields['node_stats.process.cpu.percent'] = percent;
    return this;
  }

  /**
   * Set JVM heap memory stats
   * @param heapUsedPercent - Heap used percentage
   * @param heapMaxBytes - Maximum heap size in bytes
   */
  jvmHeap(heapUsedPercent: number, heapMaxBytes?: number) {
    this.fields['node_stats.jvm.mem.heap_used_percent'] = heapUsedPercent;
    if (heapMaxBytes !== undefined) {
      this.fields['node_stats.jvm.mem.heap_max_in_bytes'] = heapMaxBytes;
    }
    return this;
  }

  /**
   * Set indices stats
   * @param docCount - Number of documents
   * @param storeSizeBytes - Store size in bytes
   */
  indicesStats(docCount: number, storeSizeBytes?: number) {
    this.fields['node_stats.indices.docs.count'] = docCount;
    if (storeSizeBytes !== undefined) {
      this.fields['node_stats.indices.store.size_in_bytes'] = storeSizeBytes;
    }
    return this;
  }

  /**
   * Set transport address
   */
  transportAddress(address: string) {
    this.fields['source_node.transport_address'] = address;
    return this;
  }
}

/**
 * Creates a node_stats document for Elasticsearch monitoring
 * @param nodeName - Name of the Elasticsearch node (e.g., "es-hot-1", "es-cold-2")
 * @param nodeUuid - UUID of the node
 * @param clusterUuid - UUID of the cluster
 */
export function nodeStats(nodeName: string, nodeUuid: string, clusterUuid: string) {
  return new NodeStats({
    type: 'node_stats',
    cluster_uuid: clusterUuid,
    timestamp: new Date().toISOString(),
    'source_node.uuid': nodeUuid,
    'source_node.name': nodeName,
    'node_stats.node_id': nodeUuid,
  });
}
