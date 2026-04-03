---
name: keyword-search
description: Guide for building keyword/full-text search with Elasticsearch. Use when a developer wants text matching, filters, faceted search, autocomplete, or traditional search functionality.
---

# Keyword Search Guide

Guide developers through building full-text keyword search with Elasticsearch. Use this guide when they need text matching, filters, faceting, autocomplete, or traditional search-bar behavior.

## 1. When to Use This Guide

Apply this guide when the developer signals:

- **Structured data** — products, articles, documents with known fields (title, description, category, price)
- **Exact matching matters** — SKUs, IDs, categories, status values must match precisely
- **Simple search bar** — user types terms and expects documents containing those terms
- **Filtering and faceting** — filter by category, price range, brand; show facet counts
- **Autocomplete / typeahead** — suggest completions as user types
- **No semantic intent** — "red shoes" should match documents containing "red" and "shoes", not "crimson sneakers"

Do **not** use this guide when: natural language queries return poor results, user expects meaning-based matching, or multilingual semantic similarity is needed. Point them to the semantic-search approach instead.

## 2. Index Mapping

Create a mapping with `text` fields (for full-text search), `keyword` sub-fields (for exact filtering and sorting), and `completion` fields (for autocomplete).

**Example: products index**

```json
PUT /products
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        },
        "analyzer": "standard"
      },
      "description": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        },
        "analyzer": "standard"
      },
      "category": {
        "type": "keyword"
      },
      "brand": {
        "type": "keyword"
      },
      "price": { "type": "float" },
      "rating": { "type": "float" },
      "created_at": { "type": "date" },
      "title_suggest": {
        "type": "completion",
        "analyzer": "simple",
        "preserve_separators": true,
        "preserve_position_increments": true,
        "max_input_length": 50
      }
    }
  }
}
```

- **text + keyword** — `title` and `description` are searchable; `title.keyword` and `description.keyword` support exact match, sorting, aggregations.
- **keyword** — `category`, `brand` use for filters and faceting.
- **completion** — `title_suggest` powers autocomplete.

**Synonyms (optional):** Add a custom analyzer with synonyms if needed:

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "synonym_analyzer": {
          "tokenizer": "standard",
          "filter": ["lowercase", "synonym_filter"]
        }
      },
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms": ["wireless, bluetooth => wireless"]
        }
      }
    }
  }
}
```

## 3. Ingestion

Use the bulk API with error handling. Index documents in batches.

```python
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch(cloud_id="...", api_key="...")

def index_products(documents: list[dict]) -> tuple[int, list]:
    """Index documents into products index. Returns (success_count, errors)."""
    actions = []
    for doc in documents:
        doc["title_suggest"] = {"input": doc.get("title", "").split()}
        actions.append({
            "_index": "products",
            "_source": doc
        })

    success, errors = helpers.bulk(
        es,
        actions,
        raise_on_error=False,
        raise_on_exception=False,
        request_timeout=30
    )

    if errors:
        for err in errors:
            if "index" in err and err["index"].get("error"):
                print(f"Error indexing doc: {err['index']['error']}")
    return success, errors
```

## 4. Query Patterns

### Basic Match Query

```json
GET /products/_search
{
  "query": {
    "match": {
      "title": "wireless headphones"
    }
  }
}
```

### Multi-Match Across Fields

```json
GET /products/_search
{
  "query": {
    "multi_match": {
      "query": "wireless headphones",
      "fields": ["title^2", "description"],
      "type": "best_fields",
      "operator": "or"
    }
  }
}
```

### Bool Query with Filters

```json
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "wireless headphones" } }
      ],
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 50, "lte": 500 } } }
      ]
    }
  }
}
```

### Fuzzy Matching (Typo Tolerance)

```json
GET /products/_search
{
  "query": {
    "match": {
      "title": {
        "query": "wirless headphons",
        "fuzziness": "AUTO"
      }
    }
  }
}
```

### Autocomplete with Completion Suggester

```json
GET /products/_search
{
  "suggest": {
    "title-suggest": {
      "prefix": "wire",
      "completion": {
        "field": "title_suggest",
        "skip_duplicates": true,
        "size": 10
      }
    }
  }
}
```

### Highlighting

```json
GET /products/_search
{
  "query": { "match": { "title": "wireless headphones" } },
  "highlight": {
    "fields": {
      "title": {},
      "description": {}
    }
  }
}
```

### Pagination

```json
GET /products/_search
{
  "query": { "match_all": {} },
  "from": 20,
  "size": 10,
  "sort": [{ "price": "asc" }]
}
```

### ES|QL (Where Applicable)

ES|QL supports filtering and sorting. Use for simple filter + sort queries:

```esql
FROM products
| WHERE category == "electronics" AND price >= 50 AND price <= 500
| SORT rating DESC
| LIMIT 20
```

For full-text search, match queries, or fuzzy matching, ES|QL does not yet support these; use Query DSL.

## 5. API Endpoint

Wrap the search in a Flask endpoint:

```python
from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch

app = Flask(__name__)
es = Elasticsearch(cloud_id="...", api_key="...")

@app.route("/search", methods=["GET"])
def search():
    q = request.args.get("q", "")
    category = request.args.get("category")
    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)
    page = request.args.get("page", 1, type=int)
    size = request.args.get("size", 10, type=int)

    must = [{"match": {"title": q}}] if q else []
    filter_clauses = []
    if category:
        filter_clauses.append({"term": {"category": category}})
    if min_price is not None:
        filter_clauses.append({"range": {"price": {"gte": min_price}}})
    if max_price is not None:
        filter_clauses.append({"range": {"price": {"lte": max_price}}})

    body = {
        "query": {
            "bool": {
                "must": must if must else [{"match_all": {}}],
                "filter": filter_clauses
            }
        },
        "from": (page - 1) * size,
        "size": size,
        "highlight": {"fields": {"title": {}, "description": {}}}
    }

    resp = es.search(index="products", body=body)
    return jsonify({
        "hits": [h["_source"] for h in resp["hits"]["hits"]],
        "total": resp["hits"]["total"]["value"],
        "page": page
    })
```

## 6. Relevance Tuning

- **Field boosting** — `"fields": ["title^2", "description"]` weights title matches higher.
- **Function score** — boost by rating, recency, or custom logic:

```json
{
  "query": {
    "function_score": {
      "query": { "match": { "title": "headphones" } },
      "functions": [
        { "field_value_factor": { "field": "rating", "modifier": "log1p" } }
      ],
      "boost_mode": "sum"
    }
  }
}
```

- **Custom analyzers** — use synonym filter, edge n-gram for prefix matching, or language-specific analyzers.
- **Synonyms** — add synonym filter for domain terms (e.g., "headphones" ↔ "earphones").

## 7. Common Follow-Ups

| Question | Answer |
|----------|--------|
| "How do I add filters?" | Add `filter` clauses to a `bool` query. Use `term` for exact match, `range` for numeric/date ranges. |
| "How do I handle typos?" | Use `fuzziness: "AUTO"` in match queries, or `match_phrase_prefix` for prefix matching. |
| "How do I add autocomplete?" | Add a `completion` field to the mapping, populate it during indexing, use the suggest API. |
| "How do I paginate?" | Use `from` and `size`. For deep pagination, prefer `search_after` with a sort key. |

## 8. When to Upgrade

Suggest hybrid or semantic search when:

- **Natural language queries** return poor results (e.g., "comfortable headphones for running" doesn't match well).
- **Multilingual content** — keyword search doesn't handle cross-language similarity.
- **"Find similar"** — user wants items similar to a selected item, not just keyword overlap.
- **Synonyms and paraphrasing** — synonym lists are too large or maintenance-heavy.

Direct the developer to the semantic-search guide for vector search, or to hybrid search (combining keyword + vector with RRF).
