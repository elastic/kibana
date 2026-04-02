---
name: catalog-ecommerce
description: Guide for building catalog and e-commerce search with Elasticsearch. Use when a developer wants product search, faceted navigation, autocomplete, "did you mean" suggestions, or shopping-oriented search experiences.
---

# Catalog / E-Commerce Search Guide

Guide developers through building product catalog and e-commerce search with Elasticsearch. Use this guide when they need product search with filtering, faceting, autocomplete, boosting by attributes, and shopping-oriented relevance.

## 1. When to Use This Guide

Apply this guide when the developer signals:

- **Product search** — search across a product catalog with titles, descriptions, categories
- **Faceted navigation** — filter by brand, category, price range, rating, with counts
- **Autocomplete / typeahead** — suggest products as the user types
- **"Did you mean"** — spelling correction and suggestions
- **Merchandising / boosting** — promote certain products (new arrivals, on sale, high margin)
- **Multi-attribute filtering** — size, color, availability, shipping options

Do **not** use this guide when: the developer only needs document search without structured attributes — point them to keyword or hybrid search. If they need meaning-based "find similar products," combine this with the semantic-search approach.

## 2. Index Mapping

E-commerce indices need text fields for search, keyword fields for filtering/faceting, numeric fields for sorting/range filters, and nested fields for variants.

```json
PUT /products
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "autocomplete_filter"]
        },
        "synonym_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "product_synonyms"]
        }
      },
      "filter": {
        "autocomplete_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 15
        },
        "product_synonyms": {
          "type": "synonym",
          "synonyms": [
            "laptop, notebook => laptop",
            "phone, mobile, cell phone => phone",
            "tv, television => tv",
            "headphones, earphones, earbuds => headphones"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "synonym_analyzer",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer", "search_analyzer": "standard" }
        }
      },
      "description": { "type": "text", "analyzer": "synonym_analyzer" },
      "category": { "type": "keyword" },
      "subcategory": { "type": "keyword" },
      "brand": { "type": "keyword" },
      "price": { "type": "float" },
      "sale_price": { "type": "float" },
      "currency": { "type": "keyword" },
      "rating": { "type": "float" },
      "review_count": { "type": "integer" },
      "in_stock": { "type": "boolean" },
      "sku": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "image_url": { "type": "keyword", "index": false },
      "created_at": { "type": "date" },
      "popularity_score": { "type": "float" },
      "attributes": {
        "type": "nested",
        "properties": {
          "name": { "type": "keyword" },
          "value": { "type": "keyword" }
        }
      },
      "title_suggest": {
        "type": "completion",
        "analyzer": "simple"
      }
    }
  }
}
```

## 3. Ingestion

```python
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch(cloud_id="...", api_key="...")

def index_products(products: list[dict]) -> tuple[int, list]:
    actions = []
    for product in products:
        product["title_suggest"] = {
            "input": [product.get("title", ""), product.get("brand", "")],
            "weight": int(product.get("popularity_score", 1))
        }
        actions.append({"_index": "products", "_id": product.get("sku"), "_source": product})

    return helpers.bulk(es, actions, raise_on_error=False, raise_on_exception=False)
```

Use `_id` = SKU so re-indexing updates in place. For large catalogs (>100K products), use bulk batches of 1,000-5,000 documents.

## 4. Query Patterns

### Product Search with Filters

```json
POST /products/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "wireless headphones",
            "fields": ["title^3", "description", "brand^2", "tags"],
            "type": "best_fields",
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        { "term": { "in_stock": true } },
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 50, "lte": 300 } } }
      ]
    }
  },
  "sort": [
    { "_score": "desc" },
    { "popularity_score": "desc" }
  ],
  "size": 20
}
```

### Faceted Navigation (Aggregations)

Return filter counts alongside search results:

```json
POST /products/_search
{
  "query": {
    "bool": {
      "must": [{ "match": { "title": "headphones" } }],
      "filter": [{ "term": { "in_stock": true } }]
    }
  },
  "size": 20,
  "aggs": {
    "categories": {
      "terms": { "field": "category", "size": 20 }
    },
    "brands": {
      "terms": { "field": "brand", "size": 20 }
    },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 50, "key": "Under $50" },
          { "from": 50, "to": 100, "key": "$50-$100" },
          { "from": 100, "to": 200, "key": "$100-$200" },
          { "from": 200, "key": "$200+" }
        ]
      }
    },
    "avg_rating": {
      "avg": { "field": "rating" }
    },
    "rating_distribution": {
      "histogram": { "field": "rating", "interval": 1, "min_doc_count": 0 }
    }
  }
}
```

### Autocomplete

```json
POST /products/_search
{
  "suggest": {
    "product-suggest": {
      "prefix": "wire",
      "completion": {
        "field": "title_suggest",
        "size": 8,
        "skip_duplicates": true,
        "fuzzy": { "fuzziness": "AUTO" }
      }
    }
  }
}
```

For search-as-you-type with results (not just suggestions):

```json
POST /products/_search
{
  "query": {
    "match": {
      "title.autocomplete": {
        "query": "wire",
        "operator": "and"
      }
    }
  },
  "size": 5,
  "_source": ["title", "brand", "price", "image_url"]
}
```

### "Did You Mean" (Spelling Suggestions)

```json
POST /products/_search
{
  "suggest": {
    "spelling": {
      "text": "wireles headphons",
      "phrase": {
        "field": "title",
        "size": 3,
        "gram_size": 3,
        "direct_generator": [{
          "field": "title",
          "suggest_mode": "popular"
        }]
      }
    }
  }
}
```

### Boosted Search (Merchandising)

Promote on-sale, highly-rated, or popular products:

```json
POST /products/_search
{
  "query": {
    "function_score": {
      "query": {
        "multi_match": {
          "query": "headphones",
          "fields": ["title^3", "description", "brand^2"]
        }
      },
      "functions": [
        {
          "field_value_factor": {
            "field": "rating",
            "modifier": "log1p",
            "factor": 2
          }
        },
        {
          "field_value_factor": {
            "field": "review_count",
            "modifier": "log1p",
            "factor": 0.5
          }
        },
        {
          "filter": { "exists": { "field": "sale_price" } },
          "weight": 1.5
        },
        {
          "gauss": {
            "created_at": {
              "origin": "now",
              "scale": "30d",
              "decay": 0.5
            }
          }
        }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  }
}
```

### Nested Attribute Filtering

Filter by dynamic product attributes (size, color, material):

```json
POST /products/_search
{
  "query": {
    "bool": {
      "must": [{ "match": { "title": "shoes" } }],
      "filter": [
        {
          "nested": {
            "path": "attributes",
            "query": {
              "bool": {
                "must": [
                  { "term": { "attributes.name": "color" } },
                  { "term": { "attributes.value": "red" } }
                ]
              }
            }
          }
        },
        {
          "nested": {
            "path": "attributes",
            "query": {
              "bool": {
                "must": [
                  { "term": { "attributes.name": "size" } },
                  { "term": { "attributes.value": "10" } }
                ]
              }
            }
          }
        }
      ]
    }
  }
}
```

## 5. API Endpoint

```python
from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch

app = Flask(__name__)
es = Elasticsearch(cloud_id="...", api_key="...")

@app.route("/search", methods=["GET"])
def product_search():
    q = request.args.get("q", "")
    category = request.args.get("category")
    brand = request.args.get("brand")
    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)
    in_stock = request.args.get("in_stock", "true").lower() == "true"
    sort_by = request.args.get("sort", "relevance")
    page = request.args.get("page", 1, type=int)
    size = request.args.get("size", 20, type=int)

    must = []
    if q:
        must.append({
            "multi_match": {
                "query": q,
                "fields": ["title^3", "description", "brand^2", "tags"],
                "type": "best_fields",
                "fuzziness": "AUTO"
            }
        })

    filters = [{"term": {"in_stock": in_stock}}]
    if category:
        filters.append({"term": {"category": category}})
    if brand:
        filters.append({"term": {"brand": brand}})
    if min_price is not None:
        filters.append({"range": {"price": {"gte": min_price}}})
    if max_price is not None:
        filters.append({"range": {"price": {"lte": max_price}}})

    sort_options = {
        "relevance": [{"_score": "desc"}, {"popularity_score": "desc"}],
        "price_asc": [{"price": "asc"}],
        "price_desc": [{"price": "desc"}],
        "rating": [{"rating": "desc"}, {"review_count": "desc"}],
        "newest": [{"created_at": "desc"}],
    }

    body = {
        "query": {
            "bool": {
                "must": must if must else [{"match_all": {}}],
                "filter": filters
            }
        },
        "from": (page - 1) * size,
        "size": size,
        "sort": sort_options.get(sort_by, sort_options["relevance"]),
        "highlight": {"fields": {"title": {}, "description": {}}},
        "aggs": {
            "categories": {"terms": {"field": "category", "size": 20}},
            "brands": {"terms": {"field": "brand", "size": 20}},
            "price_stats": {"stats": {"field": "price"}},
            "price_ranges": {
                "range": {
                    "field": "price",
                    "ranges": [
                        {"to": 25, "key": "Under $25"},
                        {"from": 25, "to": 50, "key": "$25-$50"},
                        {"from": 50, "to": 100, "key": "$50-$100"},
                        {"from": 100, "to": 200, "key": "$100-$200"},
                        {"from": 200, "key": "$200+"}
                    ]
                }
            }
        }
    }

    resp = es.search(index="products", body=body)

    return jsonify({
        "hits": [{
            "product": h["_source"],
            "score": h["_score"],
            "highlight": h.get("highlight", {})
        } for h in resp["hits"]["hits"]],
        "total": resp["hits"]["total"]["value"],
        "facets": {
            "categories": [{"key": b["key"], "count": b["doc_count"]} for b in resp["aggregations"]["categories"]["buckets"]],
            "brands": [{"key": b["key"], "count": b["doc_count"]} for b in resp["aggregations"]["brands"]["buckets"]],
            "price_ranges": [{"key": b["key"], "count": b["doc_count"]} for b in resp["aggregations"]["price_ranges"]["buckets"]],
            "price_stats": resp["aggregations"]["price_stats"]
        },
        "page": page,
        "pages": (resp["hits"]["total"]["value"] + size - 1) // size
    })

@app.route("/autocomplete", methods=["GET"])
def autocomplete():
    q = request.args.get("q", "")
    resp = es.search(
        index="products",
        body={
            "suggest": {
                "product-suggest": {
                    "prefix": q,
                    "completion": {
                        "field": "title_suggest",
                        "size": 8,
                        "skip_duplicates": True,
                        "fuzzy": {"fuzziness": "AUTO"}
                    }
                }
            }
        }
    )
    suggestions = resp["suggest"]["product-suggest"][0]["options"]
    return jsonify({
        "suggestions": [{"text": s["text"], "score": s["_score"]} for s in suggestions]
    })
```

## 6. Relevance Tuning

| Lever | Effect |
|-------|--------|
| **Field boosting** | `title^3` weights title matches higher than description |
| **Fuzziness** | `AUTO` handles typos; increase for more tolerance |
| **Function score** | Boost by rating, recency, popularity, on-sale status |
| **Synonyms** | Map domain terms so "laptop" matches "notebook" |
| **Phrase matching** | Use `match_phrase` for exact multi-word queries |

## 7. Common Follow-Ups

| Question | Answer |
|----------|--------|
| "How do I add sort options?" | Add `sort` parameter; support `price_asc`, `price_desc`, `rating`, `newest`. |
| "How do I show facet counts?" | Use aggregations (`terms`, `range`, `histogram`) alongside your query. |
| "How do I handle variants (size/color)?" | Use `nested` fields for attributes; filter with nested queries. |
| "How do I boost promoted products?" | Use `function_score` with pinned queries or manual weight boosts. |
| "How do I handle no results?" | Relax filters, try fuzzy matching, show "did you mean" suggestions, or fall back to popular products. |

## 8. When to Upgrade

- **Semantic product search** — When "comfortable headphones for running" should match even without exact keyword overlap. Add a vector field using the semantic-search approach.
- **Hybrid** — Combine keyword + semantic for the best of both. See the hybrid-search guide.
- **Personalization** — Boost results based on user behavior (clicks, purchases). Requires a signals index and custom scoring.
