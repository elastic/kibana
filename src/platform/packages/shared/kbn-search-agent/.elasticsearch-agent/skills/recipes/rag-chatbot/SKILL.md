---
name: rag-chatbot
description: Guide for building RAG (retrieval-augmented generation) chatbots and Q&A systems with Elasticsearch. Use when a developer wants to build a chatbot, Q&A system, or AI assistant that answers questions from their own data.
---

# RAG / Chatbot Guide

Guide developers through building retrieval-augmented generation (RAG) systems with Elasticsearch as the retrieval backend. Use this guide when they want a chatbot, Q&A interface, or AI assistant that answers from their own documents.

## 1. When to Use This Guide

Apply this guide when the developer signals:

- **"Build a chatbot"** — over docs, knowledge base, support articles, internal wiki
- **"Q&A over my data"** — ask questions and get answers grounded in their documents
- **"AI assistant"** — a conversational interface that references specific content
- **"Answer from my docs"** — don't hallucinate, cite sources
- **"RAG pipeline"** — they already know the pattern and want Elasticsearch as the retriever

Do **not** use this guide when: the developer only needs search results (not generated answers) — point them to keyword, semantic, or hybrid search instead.

## 2. Architecture

RAG has four stages:

1. **Chunk** — Split documents into passages small enough for embedding and context windows
2. **Embed & Index** — Store chunks with vector embeddings in Elasticsearch
3. **Retrieve** — Given a user question, find the most relevant chunks
4. **Generate** — Pass retrieved chunks + question to an LLM to produce a grounded answer

```
User Question
     │
     ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Embed query │────▶│  Elasticsearch   │────▶│  LLM (GPT,  │
│              │     │  kNN retrieval   │     │  Claude, etc)│
└─────────────┘     └──────────────────┘     └─────────────┘
                           │                        │
                     Top-k chunks              Answer + sources
```

## 3. Document Chunking

Chunking strategy depends on document structure. Ask the developer about their content.

| Strategy | When to Use | Chunk Size |
|----------|-------------|------------|
| **Fixed-size** | Uniform text, no clear sections | 500-1000 tokens |
| **Paragraph-based** | Well-structured docs with natural breaks | 1 paragraph per chunk |
| **Section-based** | Documents with headers (H1/H2/H3) | 1 section per chunk |
| **Recursive** | Mixed content, need flexibility | LangChain's `RecursiveCharacterTextSplitter` |

**Important considerations:**
- **Overlap** — Add 50-200 token overlap between chunks so context isn't lost at boundaries
- **Metadata** — Preserve source document title, URL, section header, page number with each chunk
- **Parent document** — Store the parent doc ID so you can retrieve surrounding context if needed

**Python chunking example:**

```python
def chunk_documents(documents: list[dict], chunk_size: int = 500, overlap: int = 100) -> list[dict]:
    """Split documents into overlapping chunks with metadata."""
    chunks = []
    for doc in documents:
        text = doc["content"]
        words = text.split()
        for i in range(0, len(words), chunk_size - overlap):
            chunk_text = " ".join(words[i:i + chunk_size])
            if not chunk_text.strip():
                continue
            chunks.append({
                "content": chunk_text,
                "source_title": doc.get("title", ""),
                "source_url": doc.get("url", ""),
                "chunk_index": len(chunks),
                "parent_doc_id": doc.get("id", ""),
            })
    return chunks
```

**LangChain chunking:**

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " "]
)
chunks = splitter.split_documents(documents)
```

## 4. Index Mapping

Store chunk text, embedding, and metadata for retrieval and source citation.

```json
PUT /knowledge-base
{
  "mappings": {
    "properties": {
      "content": { "type": "text" },
      "embedding": {
        "type": "dense_vector",
        "dims": 768,
        "index": true,
        "similarity": "cosine"
      },
      "source_title": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "source_url": { "type": "keyword" },
      "section_header": { "type": "text" },
      "parent_doc_id": { "type": "keyword" },
      "chunk_index": { "type": "integer" },
      "created_at": { "type": "date" }
    }
  }
}
```

## 5. Ingestion Pipeline

Use an ingest pipeline to embed chunks at index time.

```json
PUT _ingest/pipeline/embed-knowledge-base
{
  "processors": [
    {
      "inference": {
        "model_id": "e5-multilingual",
        "input_output": [
          {
            "input_field": "content",
            "output_field": "embedding"
          }
        ]
      }
    }
  ]
}
```

**Bulk index chunks:**

```python
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch(cloud_id="...", api_key="...")

def index_chunks(chunks: list[dict]) -> tuple[int, list]:
    actions = [
        {"_index": "knowledge-base", "_source": chunk, "pipeline": "embed-knowledge-base"}
        for chunk in chunks
    ]
    return helpers.bulk(es, actions, raise_on_error=False, raise_on_exception=False)
```

## 6. Retrieval Patterns

### Semantic Retrieval (Default for RAG)

```json
GET /knowledge-base/_search
{
  "knn": {
    "field": "embedding",
    "query_vector_builder": {
      "text_embedding": {
        "model_id": "e5-multilingual",
        "model_text": "How do I configure index mappings?"
      }
    },
    "k": 5,
    "num_candidates": 50
  },
  "_source": ["content", "source_title", "source_url", "section_header"]
}
```

### Hybrid Retrieval (Better for Mixed Queries)

Combine keyword and semantic for more robust retrieval:

```json
POST /knowledge-base/_search
{
  "size": 5,
  "query": {
    "bool": {
      "should": [
        { "match": { "content": "configure index mappings" } },
        {
          "knn": {
            "field": "embedding",
            "query_vector_builder": {
              "text_embedding": {
                "model_id": "e5-multilingual",
                "model_text": "How do I configure index mappings?"
              }
            },
            "k": 5,
            "num_candidates": 50
          }
        }
      ]
    }
  },
  "rank": { "rrf": {} },
  "_source": ["content", "source_title", "source_url"]
}
```

### Filtered Retrieval (Scope to Specific Sources)

```json
GET /knowledge-base/_search
{
  "knn": {
    "field": "embedding",
    "query_vector_builder": {
      "text_embedding": {
        "model_id": "e5-multilingual",
        "model_text": "How do I configure mappings?"
      }
    },
    "k": 5,
    "num_candidates": 50,
    "filter": {
      "term": { "source_title.keyword": "Elasticsearch Guide" }
    }
  }
}
```

## 7. Answer Generation

Pass retrieved chunks to an LLM with a grounded prompt.

```python
from openai import OpenAI
from elasticsearch import Elasticsearch

es = Elasticsearch(cloud_id="...", api_key="...")
llm = OpenAI()

def ask(question: str, k: int = 5) -> dict:
    # 1. Retrieve relevant chunks
    resp = es.search(
        index="knowledge-base",
        knn={
            "field": "embedding",
            "query_vector_builder": {
                "text_embedding": {
                    "model_id": "e5-multilingual",
                    "model_text": question
                }
            },
            "k": k,
            "num_candidates": k * 10
        },
        source=["content", "source_title", "source_url"]
    )
    chunks = resp["hits"]["hits"]

    # 2. Build context from retrieved chunks
    context_parts = []
    sources = []
    for i, hit in enumerate(chunks):
        src = hit["_source"]
        context_parts.append(f"[{i+1}] {src['content']}")
        sources.append({"title": src.get("source_title", ""), "url": src.get("source_url", "")})

    context = "\n\n".join(context_parts)

    # 3. Generate answer
    completion = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": (
                "Answer the user's question using ONLY the provided context. "
                "Cite sources using [1], [2], etc. "
                "If the context doesn't contain enough information, say so."
            )},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ],
        temperature=0.2
    )

    return {
        "answer": completion.choices[0].message.content,
        "sources": sources
    }
```

## 8. Conversational Memory

For multi-turn conversations, include chat history in the prompt and optionally reformulate the question.

```python
def ask_with_history(question: str, history: list[dict], k: int = 5) -> dict:
    # Reformulate question using chat history for better retrieval
    if history:
        reformulation = llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": (
                    "Rewrite the user's question as a standalone search query, "
                    "incorporating context from the conversation history."
                )},
                *history,
                {"role": "user", "content": question}
            ],
            temperature=0
        )
        search_query = reformulation.choices[0].message.content
    else:
        search_query = question

    # Retrieve using reformulated query
    result = ask(search_query, k=k)

    # Generate with full conversation context
    messages = [
        {"role": "system", "content": (
            "Answer the user's question using the provided context. "
            "Cite sources using [1], [2], etc. "
            "Consider the conversation history for context."
        )},
        *history,
        {"role": "user", "content": f"Context:\n{result['context']}\n\nQuestion: {question}"}
    ]

    completion = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.2
    )

    return {
        "answer": completion.choices[0].message.content,
        "sources": result["sources"]
    }
```

## 9. API Endpoint

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/chat", methods=["POST"])
def chat():
    body = request.json
    question = body.get("question", "")
    history = body.get("history", [])

    if not question:
        return jsonify({"error": "Missing question"}), 400

    result = ask_with_history(question, history)
    return jsonify(result)
```

## 10. Relevance Tuning for RAG

| Lever | Effect |
|-------|--------|
| **Chunk size** | Smaller = more precise retrieval, less context per chunk. Larger = more context but noisier. |
| **k (num results)** | More chunks = more context for the LLM but risks dilution. Start with 3-5. |
| **Hybrid retrieval** | Adds keyword matching; helps when questions contain specific terms or identifiers. |
| **Reranking** | Retrieve 20, rerank to top 5 with a cross-encoder for best precision. |
| **Metadata filtering** | Scope retrieval to relevant sources, time ranges, or categories. |

## 11. Common Follow-Ups

| Question | Answer |
|----------|--------|
| "The chatbot hallucinates" | Strengthen the system prompt ("only use provided context"), reduce temperature, add "I don't know" instructions. |
| "Answers are too vague" | Reduce chunk size for more precise passages; increase k for more context. |
| "How do I cite sources?" | Include source metadata in retrieval, reference in prompt with numbered citations. |
| "How do I handle long documents?" | Chunk with overlap; consider hierarchical retrieval (retrieve chunk, then fetch parent section). |
| "How do I update the knowledge base?" | Re-chunk and re-index changed documents. Use `parent_doc_id` to delete old chunks before re-indexing. |
| "Which LLM should I use?" | GPT-4o-mini for cost efficiency, GPT-4o or Claude for quality. Any OpenAI-compatible API works. |

## 12. When to Upgrade

- **Agentic RAG** — When the chatbot needs to take actions (create tickets, update records), not just answer questions. Consider Elastic's Agent Builder.
- **Multi-index RAG** — When answers span multiple data sources. Use multiple kNN queries or a unified index.
- **Streaming** — For real-time chat UX, stream LLM responses token by token.
