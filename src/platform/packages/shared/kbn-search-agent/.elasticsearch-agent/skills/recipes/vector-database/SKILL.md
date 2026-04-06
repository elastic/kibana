---
name: vector-database
description: Guide for using Elasticsearch as a vector database for AI applications. Use when a developer wants to store and retrieve embeddings, integrate with LangChain/LlamaIndex, build similarity search, or use Elasticsearch as a vector store for their AI pipeline.
---

# Elasticsearch as a Vector Database

## When to Use This Guide

Use this guide when the developer signals any of the following:

- **Framework integration**: LangChain, LlamaIndex, semantic search, RAG (retrieval-augmented generation)
- **Storage terms**: "vector store", "store embeddings", "embedding storage", "vector index"
- **Search terms**: "similarity search", "semantic search", "nearest neighbor", "kNN"
- **AI application context**: agent memory, RAG pipeline, AI assistant, chatbot with context
- **Migration**: moving from Pinecone, Weaviate, Chroma, or another vector DB

## Why Elasticsearch as a Vector DB

Elasticsearch offers distinct advantages over purpose-built vector databases:

| Advantage | Benefit |
|-----------|---------|
| **Hybrid search** | Combine vector similarity with full-text search and structured filters in a single query |
| **Metadata filtering** | Filter by date, category, user, access control before or after vector search |
| **Production-grade** | Battle-tested at scale, replication, sharding, backup, monitoring |
| **Fewer systems** | One platform for search, logging, and vectors — simpler ops |
| **Mature ecosystem** | Kibana, Beats, Elastic Agent, observability tooling |

## LangChain Integration

### Installation

```bash
pip install langchain-elasticsearch langchain-openai
```

### Setup and Usage

```python
from langchain_elasticsearch import ElasticsearchStore
from langchain_openai import OpenAIEmbeddings
from elasticsearch import Elasticsearch

# Connect to Elasticsearch (Cloud or self-managed)
es_client = Elasticsearch(
    "https://your-cluster.es.us-east-1.aws.found.io:443",
    api_key="your-api-key"
)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Create the vector store
vector_store = ElasticsearchStore(
    es_connection=es_client,
    index_name="my_docs",
    embedding=embeddings,
)

# Add documents (embeddings are computed automatically)
documents = [
    {"page_content": "Elasticsearch is a distributed search engine.", "metadata": {"source": "docs", "topic": "intro"}},
    {"page_content": "Kibana provides visualization and dashboards.", "metadata": {"source": "docs", "topic": "kibana"}},
]
vector_store.add_documents(documents)

# Similarity search
results = vector_store.similarity_search("How do I visualize data?", k=3)
for doc in results:
    print(doc.page_content, doc.metadata)

# Similarity search with metadata filter
results = vector_store.similarity_search(
    "search engine features",
    k=3,
    filter={"term": {"metadata.source": "docs"}}
)

# Use as a retriever in a LangChain chain
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI

retriever = vector_store.as_retriever(search_kwargs={"k": 5})
qa_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o-mini"),
    retriever=retriever,
    return_source_documents=True
)
answer = qa_chain.invoke({"query": "What is Kibana?"})
```

## LlamaIndex Integration

### Installation

```bash
pip install llama-index llama-index-vector-stores-elasticsearch elasticsearch
```

### Setup and Usage

```python
from llama_index.vector_stores.elasticsearch import ElasticsearchVectorStore
from llama_index.core import VectorStoreIndex, Document
from llama_index.embeddings.openai import OpenAIEmbedding

# Create the vector store
vector_store = ElasticsearchVectorStore(
    index_name="llama_docs",
    es_url="https://your-cluster.es.us-east-1.aws.found.io:443",
    es_api_key="your-api-key",
)

embed_model = OpenAIEmbedding(model="text-embedding-3-small")

# Index documents
documents = [
    Document(text="Elasticsearch supports full-text and vector search.", metadata={"category": "search"}),
    Document(text="Use Kibana for dashboards and visualizations.", metadata={"category": "viz"}),
]
index = VectorStoreIndex.from_documents(
    documents,
    vector_store=vector_store,
    embed_model=embed_model,
)

# Query
query_engine = index.as_query_engine(similarity_top_k=5)
response = query_engine.query("How do I build dashboards?")
print(response.response)
```

## Direct API Usage (Without Frameworks)

For developers not using LangChain or LlamaIndex, use the Elasticsearch API directly.

### Index Mapping for Vector Storage

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("https://your-cluster:443", api_key="your-api-key")

mapping = {
    "mappings": {
        "properties": {
            "content": {"type": "text"},
            "embedding": {
                "type": "dense_vector",
                "dims": 1536,
                "index": True,
                "similarity": "cosine"
            },
            "metadata": {
                "properties": {
                    "source": {"type": "keyword"},
                    "category": {"type": "keyword"},
                    "created_at": {"type": "date"},
                    "user_id": {"type": "keyword"}
                }
            }
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0
    }
}
es.indices.create(index="vectors", body=mapping)
```

### Storing Embeddings via Bulk API

```python
from elasticsearch import helpers

def generate_actions(docs, embeddings):
    for doc, emb in zip(docs, embeddings):
        yield {
            "_index": "vectors",
            "_source": {
                "content": doc["content"],
                "embedding": emb,
                "metadata": doc.get("metadata", {})
            }
        }

docs = [
    {"content": "Elasticsearch is fast.", "metadata": {"source": "a", "category": "intro"}},
    {"content": "Kibana visualizes data.", "metadata": {"source": "b", "category": "viz"}},
]
# Assume embeddings is a list of 1536-dim vectors from your embedding model
embeddings = [...]  # from OpenAI, Cohere, sentence-transformers, etc.
helpers.bulk(es, generate_actions(docs, embeddings))
```

### kNN Similarity Search

```python
query_vector = [...]  # 1536-dim vector from your query

resp = es.search(
    index="vectors",
    knn={
        "field": "embedding",
        "query_vector": query_vector,
        "k": 10,
        "num_candidates": 100
    },
    source=["content", "metadata"]
)
for hit in resp["hits"]["hits"]:
    print(hit["_source"]["content"], hit["_score"])
```

### Filtered Similarity Search

```python
resp = es.search(
    index="vectors",
    knn={
        "field": "embedding",
        "query_vector": query_vector,
        "k": 10,
        "num_candidates": 100,
        "filter": {
            "bool": {
                "must": [
                    {"term": {"metadata.category": "intro"}},
                    {"range": {"metadata.created_at": {"gte": "2024-01-01"}}}
                ]
            }
        }
    }
)
```

### Max Marginal Relevance (MMR) for Diversity

```python
resp = es.search(
    index="vectors",
    knn={
        "field": "embedding",
        "query_vector": query_vector,
        "k": 20,
        "num_candidates": 100
    },
    _source=["content", "metadata"]
)
# MMR: post-process in Python to diversify results
# Manual MMR: iteratively pick docs that maximize score - lambda * sim(query, doc) - (1-lambda) * max sim(doc, selected)
```

For native MMR-like behavior, use `knn` with a high `k` and re-rank in application code.

## Metadata Filtering Patterns

Combine vector similarity with structured filters:

1. **Pre-filter**: Restrict the vector search to a subset (e.g., user's docs, date range) via `knn.filter`
2. **Post-filter**: Run kNN first, then filter results (may reduce hit count)
3. **Hybrid**: Use `bool` with `must` for hard filters and `should` for soft boosts

```python
# Pre-filter: only search within user's documents
knn_filter = {"term": {"metadata.user_id": "user_123"}}

# Date range
knn_filter = {"range": {"metadata.created_at": {"gte": "2024-01-01", "lte": "2024-12-31"}}}

# Multiple conditions
knn_filter = {
    "bool": {
        "must": [
            {"term": {"metadata.tenant": "acme"}},
            {"terms": {"metadata.category": ["docs", "faq"]}}
        ]
    }
}
```

## Performance Tuning

| Setting | Purpose | Typical Values |
|---------|---------|----------------|
| `m` | HNSW graph connections | 16–32 (higher = better recall, more memory) |
| `ef_construction` | Build-time search width | 100–500 (higher = better index quality) |
| `ef_search` | Query-time search width | 50–200 (higher = better recall, slower) |
| `num_candidates` | kNN candidate pool | 10× to 20× `k` |

```python
# In index settings
"index": {
    "number_of_shards": 1,
    "hnsw": {
        "m": 24,
        "ef_construction": 200
    }
}
# At query time
"knn": {
    "field": "embedding",
    "query_vector": q,
    "k": 10,
    "num_candidates": 200
}
```

For very large datasets, consider **quantization** (int8) to reduce memory; Elasticsearch 8.x supports byte-sized vectors.

## Common Follow-ups

| Question | Answer |
|----------|--------|
| How do I filter by metadata? | Use `knn.filter` (pre-filter) or a `bool` query wrapping `knn` |
| How do I do MMR? | Fetch more candidates with kNN, then re-rank in Python using MMR (e.g., LangChain's `MMRRetriever`) |
| How do I delete/update vectors? | Use `delete_by_query` or `update` by `_id`; re-index if embedding changes |
| Pinecone vs Elasticsearch? | Elasticsearch adds hybrid search, metadata filtering, and consolidates search + vectors in one system |
| How many dimensions? | Must match your embedding model (OpenAI 1536, Cohere 1024, etc.); set in mapping |
