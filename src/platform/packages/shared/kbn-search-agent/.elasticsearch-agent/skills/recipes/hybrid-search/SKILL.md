---
name: hybrid-search
description: Guide for building hybrid search combining keyword (BM25) and vector (semantic) retrieval with Elasticsearch. Use when a developer needs both exact text matching AND meaning-based search — the best of both worlds.
---

# Hybrid Search Guide

Guide developers through building hybrid search in Elasticsearch: combining BM25 keyword retrieval with kNN vector retrieval via Reciprocal Rank Fusion (RRF).

## When to Use This Guide

Apply this guide when:

- **Users search with both keywords AND natural language** — e.g., "elasticsearch index mapping" vs "how do I define how documents are stored"
- **Need exact matches for some queries but semantic understanding for others** — product names, codes, IDs vs natural language
- **Use cases**: documentation search, product search with natural queries, e-commerce search, knowledge bases

## Architecture

Hybrid search combines two retrieval methods:

1. **BM25** — keyword-based, matches exact terms and phrases. Strong for exact matches, typos, and specific identifiers.
2. **kNN** — vector-based, matches semantic meaning. Strong for natural language, synonyms, and conceptual queries.

**Reciprocal Rank Fusion (RRF)** merges the two ranked lists:

```
RRF_score(d) = Σ 1 / (k + rank_i(d))
```

Where `k` is a constant (default 60) and `rank_i(d)` is the document's rank in list i. Elasticsearch uses `rank_constant` and `window_size` to tune RRF.

**Why RRF is often the best default choice**: It doesn't require score normalization or calibration between BM25 and kNN scores. RRF works purely on rank positions, so it's robust across different score scales and works well out of the box.

## Index Mapping

The index needs **both** text fields (for BM25) and `dense_vector` fields (for kNN). Include keyword sub-fields for filtering.

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "content": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "title_embedding": {
        "type": "dense_vector",
        "dims": 384,
        "index": true,
        "similarity": "cosine"
      },
      "content_embedding": {
        "type": "dense_vector",
        "dims": 384,
        "index": true,
        "similarity": "cosine"
      },
      "category": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

## Inference Endpoint Setup

Same as semantic search: create an inference endpoint for your embedding model.

```json
PUT _inference/text_embedding/my-embedding-model
{
  "service": "elasticsearch",
  "service_settings": {
    "model_id": "sentence-transformers__all-MiniLM-L6-v2"
  },
  "task_settings": {
    "dimensions": 384
  }
}
```

## Ingestion

Use an ingest pipeline that stores both raw text and embeddings:

```json
PUT _ingest/pipeline/hybrid-search-pipeline
{
  "processors": [
    {
      "inference": {
        "model_id": "my-embedding-model",
        "target_field": "content_embedding",
        "field_map": {
          "content": "text_field"
        }
      }
    },
    {
      "inference": {
        "model_id": "my-embedding-model",
        "target_field": "title_embedding",
        "field_map": {
          "title": "text_field"
        }
      }
    }
  ]
}
```

**Bulk API example:**

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("https://localhost:9200", basic_auth=("elastic", "changeme"))

docs = [
    {"_index": "hybrid-docs", "pipeline": "hybrid-search-pipeline", "_source": {"title": "Elasticsearch Index Mapping", "content": "Index mapping defines how documents are stored and indexed.", "category": "docs"}},
    {"_index": "hybrid-docs", "pipeline": "hybrid-search-pipeline", "_source": {"title": "kNN Search", "content": "Vector similarity search for semantic retrieval.", "category": "docs"}},
]

from elasticsearch.helpers import bulk
success, failed = bulk(es, docs, raise_on_error=False)
```

## Query Patterns

### Basic Hybrid with RRF (Primary Pattern)

```json
POST hybrid-docs/_search
{
  "size": 20,
  "query": {
    "bool": {
      "should": [
        {
          "multi_match": {
            "query": "how do I define document structure",
            "fields": ["title^2", "content"],
            "type": "best_fields"
          }
        },
        {
          "knn": {
            "field": "content_embedding",
            "query_vector_builder": {
              "text_embedding": {
                "model_id": "my-embedding-model",
                "model_text": "how do I define document structure"
              }
            },
            "k": 20,
            "num_candidates": 100
          }
        }
      ]
    }
  },
  "rank": {
    "rrf": {
      "window_size": 100,
      "rank_constant": 60
    }
  }
}
```

### Hybrid with Filters

```json
POST hybrid-docs/_search
{
  "size": 20,
  "query": {
    "bool": {
      "filter": [
        { "term": { "category": "docs" } }
      ],
      "should": [
        { "multi_match": { "query": "mapping", "fields": ["title^2", "content"] } },
        {
          "knn": {
            "field": "content_embedding",
            "query_vector_builder": {
              "text_embedding": {
                "model_id": "my-embedding-model",
                "model_text": "mapping"
              }
            },
            "k": 20,
            "num_candidates": 100
          }
        }
      ]
    }
  },
  "rank": { "rrf": {} }
}
```

### Hybrid with Reranking

Add a second-stage reranker (e.g., cross-encoder) for top results:

```python
# 1. Run hybrid query, fetch more candidates
response = es.search(
    index="hybrid-docs",
    size=50,
    query={"bool": {"should": [bm25_query, knn_query]}},
    rank={"rrf": {"window_size": 100}}
)
candidates = response["hits"]["hits"]

# 2. Rerank with cross-encoder (external or inference endpoint)
# Pass query + each candidate text to reranker, sort by reranker score
# Return top 10
```

### Adjusting Balance: Keyword vs Semantic

- **`window_size`** (default 100): How many docs from each sub-query to consider for RRF. Larger = more semantic influence if BM25 returns fewer matches.
- **`rank_constant`** (default 60): Higher = less penalty for lower ranks. Lower = steeper rank decay.
- **Field boosting on BM25**: Use `title^2` or `content^1.5` to favor keyword matches in specific fields.

## API Endpoint

Flask example wrapping hybrid query:

```python
from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch

app = Flask(__name__)
es = Elasticsearch("https://localhost:9200", basic_auth=("elastic", "changeme"))

@app.route("/search", methods=["GET"])
def hybrid_search():
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "Missing q parameter"}), 400

    response = es.search(
        index="hybrid-docs",
        size=20,
        query={
            "bool": {
                "should": [
                    {"multi_match": {"query": q, "fields": ["title^2", "content"]}},
                    {
                        "knn": {
                            "field": "content_embedding",
                            "query_vector_builder": {
                                "text_embedding": {
                                    "model_id": "my-embedding-model",
                                    "model_text": q
                                }
                            },
                            "k": 20,
                            "num_candidates": 100
                        }
                    }
                ]
            }
        },
        rank={"rrf": {"window_size": 100, "rank_constant": 60}}
    )
    return jsonify({"hits": [h["_source"] for h in response["hits"]["hits"]]})
```

## Relevance Tuning

| Parameter | Effect |
|-----------|--------|
| `window_size` | Larger = more docs from each branch in RRF; can help semantic when BM25 is sparse |
| `rank_constant` | Lower = stronger preference for top ranks; higher = flatter rank contribution |
| BM25 field boost | `title^2` favors exact matches in title |
| `num_candidates` | Higher = better kNN recall, slower |

**When to add a reranker**: When you need maximum relevance and can afford latency. Rerank top 20–50 hybrid results with a cross-encoder before returning to the user.

## Common Follow-ups

| Question | Guidance |
|----------|----------|
| "How do I weight keyword vs semantic?" | Tune `window_size` and `rank_constant`; boost BM25 fields; consider separate indices and blend scores manually for fine control |
| "Results are too semantic" | Increase BM25 influence: boost text fields, lower `window_size` |
| "Results are too keyword-heavy" | Increase kNN influence: raise `window_size`, ensure good embeddings |
| "How do I add reranking?" | Fetch 20–50 from hybrid, pass to cross-encoder, return top 10 |
| "How does RRF work?" | RRF_score = Σ 1/(k + rank). No score normalization needed; rank-only fusion |

## When to Consider Alternatives

| Alternative | When to Use |
|-------------|-------------|
| **Pure keyword** | All queries are exact (IDs, codes, product SKUs) |
| **Pure semantic** | All queries are natural language; no need for exact term matches |
| **RAG** | Developer wants to generate answers from retrieved content, not just return documents |
