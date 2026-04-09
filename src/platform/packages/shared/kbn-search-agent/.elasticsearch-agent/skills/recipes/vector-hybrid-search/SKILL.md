---
name: vector-hybrid-search
description: >
  Guide for building vector search, hybrid search, and using Elasticsearch as a vector database.
  Covers semantic_text, dense_vector, embedding strategies, hybrid BM25+kNN via RRF, reranking,
  and production optimization. Use when a developer wants semantic search, hybrid search, kNN,
  embeddings, or Elasticsearch as a vector store.
---

# Vector & Hybrid Search Guide

Covers the full lifecycle of vector or hybrid search with Elasticsearch — planning, data modeling, search implementation, and optimization. All API examples use SENSE syntax for Kibana Dev Tools.

## Decision: Embedding Strategy

Ask these routing questions first:

1. "Are you already generating embeddings?" → Yes → `dense_vector` path. Briefly offer `semantic_text` as a simpler alternative.
2. "What version of Elasticsearch?" → Below 8.15 → `semantic_text` unavailable, use `dense_vector`.

| Option                           | When to Use                                                      |
| -------------------------------- | ---------------------------------------------------------------- |
| **Built-in via EIS**             | Default for Cloud (Serverless or ECH) on 8.15+. No ML node cost. |
| **Third-party (OpenAI, Cohere)** | Existing model contract or specific model requirement.           |
| **Self-hosted**                  | Custom fine-tuned models deployed on ML nodes.                   |

## Decision: Vector Field Type

| Option              | Field Type      | When to Use                                                                         |
| ------------------- | --------------- | ----------------------------------------------------------------------------------- |
| **`semantic_text`** | `semantic_text` | 8.15+, no existing vectors. Default recommendation — auto chunking, auto embedding. |
| **`dense_vector`**  | `dense_vector`  | Bringing your own vectors, need dims/similarity control, or pre-8.15.               |

### `semantic_text` Mapping (Default)

Minimal — works out of the box on Serverless:

```
PUT /my-index
{
  "mappings": {
    "properties": {
      "content": { "type": "semantic_text" },
      "title": { "type": "text" },
      "category": { "type": "keyword" }
    }
  }
}
```

With a specific inference endpoint:

```
PUT /my-index
{
  "mappings": {
    "properties": {
      "content": {
        "type": "semantic_text",
        "inference_id": "my-inference-endpoint"
      }
    }
  }
}
```

### `dense_vector` Mapping

```
PUT /my-index
{
  "mappings": {
    "properties": {
      "content": { "type": "text" },
      "content_embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      },
      "category": { "type": "keyword" }
    }
  }
}
```

Set `dims` to match the embedding model output (OpenAI text-embedding-3-small = 1536, E5-small = 384).

## Decision: Search Type

| Option                           | When to Use                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------- |
| **Pure kNN**                     | All queries are semantic/meaning-based, no exact term matching needed.            |
| **Hybrid (BM25 + kNN via RRF)**  | Users search with both keywords AND natural language. **Default recommendation.** |
| **Semantic via `semantic_text`** | Using `semantic_text` field — simplest semantic search.                           |

### Semantic Search (`semantic_text`)

```
POST /my-index/_search
{
  "retriever": {
    "standard": {
      "query": {
        "semantic": {
          "field": "content",
          "query": "how do I configure index mappings"
        }
      }
    }
  }
}
```

### Pure kNN (`dense_vector`)

```
POST /my-index/_search
{
  "retriever": {
    "knn": {
      "field": "content_embedding",
      "query_vector": [0.1, 0.2, 0.3],
      "k": 10,
      "num_candidates": 100
    }
  }
}
```

### Hybrid Search with RRF

```
POST /my-index/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "multi_match": {
                "query": "elasticsearch index mapping",
                "fields": ["title^2", "content"]
              }
            }
          }
        },
        {
          "knn": {
            "field": "content_embedding",
            "query_vector": [0.1, 0.2, 0.3],
            "k": 50,
            "num_candidates": 100
          }
        }
      ],
      "window_size": 100,
      "rank_constant": 60
    }
  }
}
```

Add `filter` clauses to both retrievers for filtered hybrid search.

## Reranking

Start without reranking. Add `text_similarity_reranker` if relevance isn't good enough after tuning:

```
POST /my-index/_search
{
  "retriever": {
    "text_similarity_reranker": {
      "retriever": { "rrf": { "retrievers": [ ... ] } },
      "field": "content",
      "inference_id": "my-reranker-endpoint",
      "inference_text": "your query",
      "rank_window_size": 50
    }
  }
}
```

Check [reranker docs](https://www.elastic.co/docs/solutions/search/ranking/semantic-reranking) for current inference endpoint setup.

## Production Optimization

**Quantization** — reduces vector memory footprint:

| Type        | Memory Reduction | Recall Impact |
| ----------- | ---------------- | ------------- |
| `hnsw`      | Baseline         | Baseline      |
| `int8_hnsw` | ~4x              | Minimal       |
| `int4_hnsw` | ~8x              | Small         |
| `bbq_hnsw`  | ~32x             | Moderate      |

**Shard sizing** — target 10-50 GB per shard, max 200M docs per shard.

## Common Follow-ups

| Question                               | Answer                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| "Results aren't relevant"              | Tune `window_size` and `rank_constant` in RRF. Run `_rank_eval` with test queries. |
| "Memory is too high"                   | Add `int8_hnsw` quantization to `dense_vector` mapping and reindex.                |
| "How do I weight keyword vs semantic?" | Adjust RRF `window_size` — higher favors semantic, lower favors BM25.              |
