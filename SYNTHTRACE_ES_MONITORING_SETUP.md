# Synthtrace Scenario for Elasticsearch Monitoring

## 🎯 Original ES|QL Query

```esql
FROM .monitoring-es-*
  | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"
  | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_bytes) BY source_node.name
  | WHERE min_available_bytes = 107374182400
  | KEEP source_node.name, min_available_bytes
```

## 📁 Created Files

### 1. Base Library - Node Stats Support
**Location:** `src/platform/packages/shared/kbn-synthtrace-client/src/lib/monitoring/node_stats.ts`

This is the base class that allows generating `node_stats` documents with all necessary fields:
- Node information (name, uuid, transport_address)
- Filesystem statistics (available_bytes, total_bytes)
- CPU and JVM memory
- Index statistics


### 2. Synthtrace Scenario
**Location:** `src/platform/packages/shared/kbn-synthtrace/src/scenarios/elasticsearch_node_stats_monitoring.ts`

Generates data for 6 nodes (3 hot + 3 cold) with different scenarios:
- ✅ **es-node-hot-1**: Constant 100GB (matches query)
- ✅ **es-node-hot-2**: Fluctuates 100-200GB (minimum matches)
- ❌ **es-node-hot-3**: Constant 200GB (doesn't match)
- ✅ **es-node-cold-1**: Constant 100GB (matches query)
- ❌ **es-node-cold-2**: Constant 50GB (doesn't match)
- ✅ **es-node-cold-3**: Fluctuates 100-200GB (minimum matches)

### 3. Documentation
**Location:** `src/platform/packages/shared/kbn-synthtrace/src/scenarios/elasticsearch_node_stats_monitoring_README.md`

Complete documentation with:
- Scenario description
- Generated data structure
- Usage examples
- Customization instructions

### 4. Standalone Example Script
**Location:** `examples/generate_es_monitoring_data.js`

Executable script that generates and indexes data directly into Elasticsearch without needing to use the synthtrace CLI.

## 🚀 Ways to Use

### Option 1: Use Synthtrace CLI

```bash
# Connecting to a remote cluster and a local kibana
node scripts/synthtrace elasticsearch_node_stats_monitoring --live --target https://{ELASTIC_USERNAME}:{ELASTIC_PASSWORD}@{ELASTIC_DEPLOYMENT_HOST}:443 --kibana http://localhost:5601
```

## ✅ Verification

After generating the data, run the query in Kibana Dev Console:

```esql
FROM .monitoring-es-*
  | WHERE source_node.name LIKE "-hot-" OR source_node.name LIKE "-cold-"
  | STATS min_available_bytes = MIN(node_stats.fs.total.available_in_bytes) BY source_node.name
  | WHERE min_available_bytes = 107374182400
  | KEEP source_node.name, min_available_bytes
```


