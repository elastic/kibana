---
name: use-case-library
description: >
  Elasticsearch use case library — the full map of what you can build, with industry examples
  and technologies. Use when a developer asks "what can Elastic do?", "what can I build?",
  "what use cases does Elasticsearch support?", or needs help choosing what to build.
---

# Elasticsearch Use Case Library

Present this library when a user asks what they can build with Elasticsearch, wants to explore use cases, or needs help figuring out which category their project falls into. Walk through the relevant use cases conversationally — don't dump the entire list. Ask what resonates, then continue the conversation.

## Conversation flow — return to onboarding

This skill helps users explore what they can build. It is **not** the main conversation driver.

Once the user picks a use case or is ready to start building, **re-read `/elasticsearch-onboarding`** to enter the structured onboarding playbook (Steps 1–7: intent → data → mapping → build → test → iterate). That playbook controls sequencing, the one-question-at-a-time rule, and the Dev Tools API-snippet workflow. If `/elasticsearch-onboarding` has not been loaded yet in this conversation, load it now — it is the primary conversation flow for all Elasticsearch search onboarding.

## How to Use This Library

1. **If the user is exploring** — summarize the 8 use cases with one-line descriptions and ask which sounds closest to what they're building.
2. **If the user describes something specific** — match it to a use case below and confirm: "That sounds like [use case] — here's what that typically involves. Sound right?"
3. **Once a use case is confirmed** — continue the conversation to understand their data and design the Elasticsearch resources.

## The Use Cases

### 1. Product & Catalog Search

Help users find and filter items from a structured catalog.

**Industries:** E-commerce, marketplace, retail, real estate, automotive, job boards

**Examples:**

- Online store product search with filters and facets
- Marketplace listing search (Airbnb, Etsy-style)
- Auto parts lookup by make, model, year
- Job search with location, salary, and role filters

**What Elasticsearch does:**

- Full-text search (BM25) for keyword matching on titles and descriptions
- Faceted filtering for price ranges, categories, brands, ratings
- Fuzzy matching for typo tolerance
- Synonyms API for domain-specific equivalents
- Completion suggester for autocomplete

**In Kibana:** Create the index and mapping via Dev Tools, set up synonyms, ingest sample data with `POST _bulk`, and test queries — all before writing any application code.

---

### 2. Knowledge Base & Document Search

Let people search long-form content and find relevant passages.

**Industries:** SaaS, publishing, education, government, legal, healthcare

**Examples:**

- Internal wiki or documentation search
- Legal case law research
- Medical literature search
- Government policy and regulation search

**What Elasticsearch does:**

- Hybrid search (BM25 + kNN via RRF) for exact match + meaning
- Semantic search via `semantic_text` for meaning-based retrieval
- Highlighting to show matching snippets in context
- Nested objects for structured document sections

**In Kibana:** Set up the index with `semantic_text` fields via Dev Tools, configure inference endpoints, and test hybrid queries. The retrieval backend is fully configured before any frontend work.

---

### 3. AI-Powered Assistant / Chatbot

Build a conversational agent that answers questions using your data.

**Industries:** Customer support, SaaS, healthcare, financial services, education

**Examples:**

- "ChatGPT over your docs" — answer questions from company knowledge
- Internal IT helpdesk bot
- Patient FAQ bot for healthcare providers

**What Elasticsearch does:**

- RAG pipeline — retrieve relevant chunks, feed to LLM for answer generation
- Vector search (kNN) for semantically similar content retrieval
- Embedding models via EIS (Elastic Inference Service) — no external API key needed
- Chunking and ingest pipelines for document processing

**In Kibana:** Set up the vector index, configure the inference endpoint, ingest and chunk documents via Dev Tools. The retrieval layer is ready to connect to an LLM from your application code in the IDE.

---

### 4. Recommendations & Discovery

Suggest relevant content users didn't explicitly search for.

**Industries:** Media, streaming, e-commerce, news, social platforms

**Examples:**

- "You might also like" product suggestions
- Related articles or blog posts
- Content personalization based on reading history

**What Elasticsearch does:**

- Vector similarity (kNN) to find items close in embedding space
- More Like This queries for content-based similarity
- Filtering + boosting to constrain by category, recency, availability
- Script scoring to blend similarity with business rules

**In Kibana:** Create the vector index, ingest item embeddings, and test similarity queries in Dev Tools. Integrate the query into your application afterward.

---

### 5. Customer Support Search

Help agents find solutions faster and customers help themselves.

**Industries:** SaaS, telecom, financial services, insurance, utilities

**Examples:**

- Agent assist — find similar resolved tickets
- Self-service portal search
- Knowledge deflection — suggest articles before filing a ticket

**What Elasticsearch does:**

- Hybrid search for exact match on error codes + semantic match on symptom descriptions
- Synonyms API for domain terminology ("can't log in" = "authentication failure")
- Highlighting to surface relevant resolution steps
- Aggregations to detect support trends

**In Kibana:** Set up the index with hybrid fields, create synonym sets, and test queries in Dev Tools. The search backend is production-ready before building the support UI.

---

### 6. Location-Based Search

Find things near a place — stores, restaurants, properties, services.

**Industries:** Retail, food delivery, real estate, travel, logistics

**Examples:**

- Store locator
- "Restaurants near me" with cuisine filters
- Property search within a neighborhood

**What Elasticsearch does:**

- `geo_point` / `geo_shape` fields for coordinates and boundaries
- Distance sorting by proximity
- Bounding box and polygon filters
- Combined with full-text — "pizza near me" = geo filter + keyword search

**In Kibana:** Create the index with geo fields, bulk-index location data via Dev Tools, and test distance queries. Combine with full-text search in the same index.

---

### 7. Log & Event Search

Search, explore, and analyze machine-generated data.

**Industries:** DevOps, security operations, IoT, financial services

**Examples:**

- Application log search and troubleshooting
- Security event investigation
- IoT sensor data exploration
- Audit trail search

**What Elasticsearch does:**

- Data streams for append-only, time-partitioned storage
- Index Lifecycle Management (ILM) for data tiers
- ES|QL for piped analytics queries
- Aggregations for histograms, percentiles, and trends

**Note:** Log and event search is typically handled by Elastic's **Observability** or **Security** solutions with purpose-built UIs. In Kibana: switch solution view under **Management → Spaces** (Hosted) or create an Observability/Security project (Serverless).

---

### 8. Vector Database (for AI/ML Pipelines)

Store and retrieve embeddings programmatically — code searches, not people.

**Industries:** AI/ML companies, any organization building with LLMs

**Examples:**

- Embedding storage and retrieval for RAG pipelines
- Image similarity search
- Code search by semantic meaning
- Duplicate detection across large document sets

**What Elasticsearch does:**

- Dense vector fields for high-dimensional embeddings
- kNN / ANN (HNSW) for approximate nearest neighbor search at scale
- Scalar and product quantization for cost/performance
- Metadata filtering to combine vector similarity with structured filters

**In Kibana:** Create the vector index, configure quantization, and test kNN queries in Dev Tools. Connect your AI pipeline from your IDE using the Elasticsearch client library.

---

## Quick Reference: Use Case to Technology Map

| Use Case                 | Primary Tech                       | Set Up in Kibana                                |
| ------------------------ | ---------------------------------- | ----------------------------------------------- |
| Product & catalog search | Full-text (BM25), facets, synonyms | Index + mapping + synonyms via Dev Tools        |
| Knowledge base search    | Hybrid (BM25 + kNN via RRF)        | Index with `semantic_text` + inference endpoint |
| AI assistant / chatbot   | Vector search (kNN), RAG           | Vector index + chunking pipeline via Dev Tools  |
| Recommendations          | Vector similarity, More Like This  | Vector index + similarity queries               |
| Customer support search  | Hybrid search, synonyms            | Index + synonym sets + hybrid queries           |
| Location-based search    | `geo_point`, distance sort         | Index with geo fields + distance queries        |
| Log & event search       | Data streams, ILM, ES\|QL          | Use Observability/Security solution view        |
| Vector database          | Dense vectors, kNN/ANN             | Vector index + quantization config              |

## Non-Search Use Cases

If the user describes something that isn't search, redirect within Kibana:

- **Monitoring infrastructure or applications** — That's Elastic Observability. Switch solution view under **Management → Spaces** or create an Observability project on Serverless.
- **Detecting threats or investigating security events** — That's Elastic Security. Switch solution view or create a Security project.
- **Building dashboards and visualizations** — Kibana has built-in dashboards, Lens, and Maps. Navigate to **Analytics → Dashboards**.
