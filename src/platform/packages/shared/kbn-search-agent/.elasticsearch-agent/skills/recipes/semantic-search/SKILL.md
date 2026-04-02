---
name: semantic-search
description: Guide for building semantic/vector search with Elasticsearch. Use when a developer wants meaning-based search, similarity matching, or natural language queries that go beyond keyword matching.
---

# Semantic Search Guide

Guide developers through building semantic/vector search with Elasticsearch. Use this guide when they need meaning-based search, similarity matching, or natural language queries that go beyond keyword matching.

## 1. When to Use This Guide

Apply this guide when the developer signals:

- **Natural language queries** — "comfortable headphones for running" should match relevant products even without exact word overlap
- **"Find similar items"** — user selects an item and wants semantically similar results
- **Meaning matters more than exact words** — "affordable" should relate to "budget", "cheap", "low-cost"
- **Multilingual content** — queries in one language should match content in another
- **Recommendations** — "users who liked X also liked Y" style similarity

Do **not** use this guide when: exact matching (SKUs, IDs, categories) is primary, or when keyword search already satisfies the use case. Point them to the keyword-search approach or hybrid search.

## 2. Architecture

Semantic search has three pieces the developer must understand:

1. **Embedding model (inference endpoint)** — Converts text to a dense vector. Elastic hosts models (ELSER, E5) or you connect external APIs (OpenAI, Cohere).
2. **Vector field (`dense_vector`)** — Stores embeddings in the index. Dimensions must match the model output.
3. **kNN query** — Finds documents whose vectors are nearest to the query vector. Use `query_vector_builder` so Elasticsearch embeds the query text at query time.

## 3. Inference Endpoint Setup

Ask which model the developer wants. Tradeoffs:

| Model | Pros | Cons | Dimensions |
|-------|------|------|------------|
| **ELSER** | Elastic's model, no API key, sparse vectors | English only, different query pattern | Sparse |
| **E5 multilingual** | Multilingual, good quality, no API key | Requires Elastic to host | 768 |
| **OpenAI** | High quality, widely used | API key, cost, latency | 1536 (ada-002) or 3072 |
| **Cohere** | Multilingual, good for retrieval | API key, cost | 1024 |

**ELSER (sparse, English):**

```json
PUT _inference/sparse_embedding/elser
{
  "service": "elasticsearch",
  "service_settings": {
    "model_id": ".elser_model_2",
    "num_allocations": 1,
    "num_threads": 1
  }
}
```

**E5 multilingual (dense, 768 dims):**

```json
PUT _inference/text_embedding/e5-multilingual
{
  "service": "elasticsearch",
  "service_settings": {
    "model_id": ".multilingual-e5-small",
    "num_allocations": 1,
    "num_threads": 1
  }
}
```

**OpenAI (requires API key):**

```json
PUT _inference/text_embedding/openai-embeddings
{
  "service": "openai",
  "service_settings": {
    "api_key": "sk-..."
  },
  "task_settings": {
    "model": "text-embedding-ada-002"
  }
}
```

**Cohere (requires API key):**

```json
PUT _inference/text_embedding/cohere-embeddings
{
  "service": "cohere",
  "service_settings": {
    "api_key": "your-cohere-api-key"
  },
  "task_settings": {
    "model": "embed-multilingual-v3.0"
  }
}
```

## 4. Index Mapping

Add a `dense_vector` field with dimensions matching your model. Include metadata fields for filtering.

**Example: products with embeddings**

```json
PUT /products-semantic
{
  "mappings": {
    "properties": {
      "title": { "type": "text" },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "embedding": {
        "type": "dense_vector",
        "dims": 768,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

- **dims** — Must match model output (768 for E5, 1536 for OpenAI ada-002, 1024 for Cohere).
- **index: true** — Enables approximate kNN; required for efficient vector search.
- **similarity** — `cosine` (default), `l2_norm`, or `dot_product`.

## 5. Ingestion with Embeddings

Use an ingest pipeline so Elasticsearch embeds text during indexing. No need to compute embeddings in application code.

**Create ingest pipeline:**

```json
PUT _ingest/pipeline/embed-products
{
  "processors": [
    {
      "inference": {
        "model_id": "e5-multilingual",
        "input_output": [
          {
            "input_field": "description",
            "output_field": "embedding"
          }
        ]
      }
    }
  ]
}
```

**Bulk index with pipeline:**

```python
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch(cloud_id="...", api_key="...")

def index_products_with_embeddings(documents: list[dict]) -> tuple[int, list]:
    """Index documents; embeddings are computed by the ingest pipeline."""
    actions = [
        {
            "_index": "products-semantic",
            "_source": doc,
            "pipeline": "embed-products"
        }
        for doc in documents
    ]
    success, errors = helpers.bulk(
        es,
        actions,
        raise_on_error=False,
        raise_on_exception=False,
        request_timeout=60
    )
    return success, errors
```

If `description` is empty, the inference processor may fail. Add a conditional or use a script to fall back to `title`.

## 6. Query Patterns

**kNN with query_vector_builder (query text auto-embedded):**

```json
GET /products-semantic/_search
{
  "knn": {
    "field": "embedding",
    "query_vector_builder": {
      "text_embedding": {
        "model_id": "e5-multilingual",
        "model_text": "comfortable noise cancelling headphones for running"
      }
    },
    "k": 10,
    "num_candidates": 100
  }
}
```

**kNN with filters:**

```json
GET /products-semantic/_search
{
  "knn": {
    "field": "embedding",
    "query_vector_builder": {
      "text_embedding": {
        "model_id": "e5-multilingual",
        "model_text": "wireless headphones"
      }
    },
    "k": 10,
    "num_candidates": 100,
    "filter": {
      "bool": {
        "must": [
          { "term": { "category": "electronics" } },
          { "range": { "price": { "lte": 500 } } }
        ]
      }
    }
  }
}
```

**ES|QL:** kNN is not yet supported in ES|QL; use Query DSL for vector search.

## 7. API Endpoint

```python
from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch

app = Flask(__name__)
es = Elasticsearch(cloud_id="...", api_key="...")

@app.route("/semantic-search", methods=["GET"])
def semantic_search():
    q = request.args.get("q", "")
    category = request.args.get("category")
    k = request.args.get("k", 10, type=int)

    knn = {
        "field": "embedding",
        "query_vector_builder": {
            "text_embedding": {
                "model_id": "e5-multilingual",
                "model_text": q
            }
        },
        "k": k,
        "num_candidates": min(k * 10, 500)
    }

    if category:
        knn["filter"] = {"term": {"category": category}}

    resp = es.search(index="products-semantic", body={"knn": knn})
    return jsonify({
        "hits": [h["_source"] for h in resp["hits"]["hits"]],
        "total": len(resp["hits"]["hits"])
    })
```

## 8. Relevance Tuning

- **k and num_candidates** — Higher `k` returns more results; higher `num_candidates` improves recall but increases latency. Rule of thumb: `num_candidates` = 5-10x `k`.
- **Filtering** — Apply `filter` in the kNN block to restrict the candidate set before ranking.
- **Reranking** — For best quality, retrieve more (e.g., k=50) and rerank with a cross-encoder or LLM.
- **Similarity** — `cosine` works well for normalized embeddings; `dot_product` for unnormalized.

## 9. Common Follow-Ups

| Question | Answer |
|----------|--------|
| "Results aren't relevant" | Increase `num_candidates`; try a different model; add hybrid search (keyword + vector) with RRF. |
| "How do I add filters to vector search?" | Add a `filter` object inside the `knn` block. |
| "Which model should I use?" | E5 multilingual for no-API-key, multilingual. OpenAI/Cohere for highest quality and external ecosystem. |
| "How do I switch models?" | Create a new inference endpoint, new index with matching dims, reindex with new pipeline. |

## 10. When to Upgrade

Suggest hybrid search when:

- **Exact matches matter** — SKUs, IDs, or specific terms must appear; vectors can miss these.
- **Mixed query types** — Some queries are navigational (category + filters), others semantic.
- **Best of both** — Combine BM25 (keyword) and kNN (vector) with RRF for robust relevance.

Direct the developer to the hybrid-search guide or combine `query` + `knn` + `rank` in a single search request.
