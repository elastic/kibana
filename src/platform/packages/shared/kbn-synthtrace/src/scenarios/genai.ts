/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates GenAI (OTel semantic conventions) APM traces across multiple services
 * for testing the GenAI tab in the span/transaction details flyout.
 *
 * --- How each service appears in APM ---
 *
 * Services 1–5, 9, and 10 generate root SERVER spans that carry gen_ai.* attributes
 * directly, so the GenAI tab appears immediately in the transaction flyout when you
 * click any trace in Services > Traces. Service 9 (genai-realworld-service) mirrors
 * the chat service exactly but with a long, multi-turn conversation (markdown + code
 * blocks) to test rendering fidelity and the View more toggle. Service 10
 * (genai-maxlen-service) pads every message so its serialized JSON is exactly 1024
 * chars — the ES flattened ignore_above boundary — to prove the longest indexable
 * message still renders.
 *
 * Services 6–7 generate realistic OTel traces (SERVER root transaction + CLIENT
 * genAI exit spans as children). The GenAI tab appears in the SPAN flyout when you
 * expand the trace waterfall and click an individual exit span.
 *
 * Service 8 is a plain HTTP service — the GenAI tab must NOT appear anywhere.
 *
 * --- OTel GenAI semantic conventions covered ---
 *   gen_ai.operation.name: chat | embeddings | create_image
 *   gen_ai.system: openai | anthropic | aws.bedrock | vertex_ai
 *   gen_ai.request.{model, temperature, top_p, top_k, max_tokens, seed}
 *   gen_ai.response.{model, id, finish_reasons}
 *   gen_ai.usage.{input_tokens, output_tokens}
 *   gen_ai.provider.name (EDOT extension)
 *   gen_ai.input.messages / gen_ai.output.messages (EDOT extension)
 *   gen_ai.system_instructions / gen_ai.conversation.id (EDOT extension)
 *
 * --- Run ---
 *   node scripts/synthtrace genai --live --clean
 */

import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { ApmOtelFields } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// ---------------------------------------------------------------------------
// Message fixtures (EDOT-captured prompt/response content)
// ---------------------------------------------------------------------------

const CHAT_INPUT_MESSAGES = [
  JSON.stringify({
    role: 'system',
    content:
      'You are an expert ML engineer specializing in Python and HuggingFace Transformers. Answer concisely with clean code examples.',
  }),
  JSON.stringify({
    role: 'user',
    content: 'How do I load a pre-trained BERT model from HuggingFace Transformers for inference?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '```python\nfrom transformers import AutoModel, AutoTokenizer\nimport torch\n\nmodel_name = "bert-base-uncased"\ntokenizer = AutoTokenizer.from_pretrained(model_name)\nmodel = AutoModel.from_pretrained(model_name)\n\ndevice = torch.device("cuda" if torch.cuda.is_available() else "cpu")\nmodel = model.to(device)\n\nmodel.eval()\nprint(f"Loaded {model_name} on {device}")\n```',
  }),
  JSON.stringify({
    role: 'user',
    content: 'How do I tokenize text and create batches for the model?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '```python\ntexts = ["Hello world", "HuggingFace rocks", "Batch inference"]\nbatch = tokenizer(\n    texts,\n    padding=True,\n    truncation=True,\n    max_length=128,\n    return_tensors="pt"\n)\nbatch = {k: v.to(device) for k, v in batch.items()}\n\nwith torch.no_grad():\n    out = model(**batch)\n```',
  }),
  JSON.stringify({
    role: 'user',
    content: 'What are the trade-offs between FP16 and FP32 training?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '| Aspect | FP16 | FP32 |\n|--------|------|------|\n| Memory | ~2x less | Baseline |\n| Speed | ~2x faster | Baseline |\n| Precision | Lower | Higher |\n| Overflow risk | Higher | Low |\n\nEnable AMP with:\n\n```python\nscaler = torch.cuda.amp.GradScaler()\n```',
  }),
  JSON.stringify({
    role: 'user',
    content: 'What are the best practices for reducing GPU memory usage during training?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '1. Use gradient checkpointing: `model.gradient_checkpointing_enable()`.\n2. Enable mixed precision (FP16/BF16) via `torch.autocast`.\n3. Reduce batch size and accumulate gradients.\n4. Call `optimizer.zero_grad(set_to_none=True)` each step.\n5. Free tensors with `del` + `torch.cuda.empty_cache()`.\n\n```python\nfor step, batch in enumerate(loader):\n    optimizer.zero_grad(set_to_none=True)\n    with torch.autocast(device_type="cuda"):\n        loss = model(**batch).loss / accum_steps\n    scaler.scale(loss).backward()\n    if (step + 1) % accum_steps == 0:\n        scaler.step(optimizer)\n        scaler.update()\n```',
  }),
  JSON.stringify({
    role: 'user',
    content: 'How do I save and load model checkpoints during fine-tuning?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '```python\ndef save_checkpoint(model, optimizer, epoch, path):\n    os.makedirs(path, exist_ok=True)\n    torch.save({\n        "epoch": epoch,\n        "model": model.state_dict(),\n        "optimizer": optimizer.state_dict(),\n    }, f"{path}/ckpt_{epoch}.pt")\n\nckpt = torch.load("checkpoints/ckpt_5.pt")\nmodel.load_state_dict(ckpt["model"])\n```\n\n> Always call `tokenizer.save_pretrained(path)` alongside `model.save_pretrained(path)` so the checkpoint is fully self-contained.',
  }),
  JSON.stringify({
    role: 'user',
    content: 'How can I export this fine-tuned model to ONNX for production deployment?',
  }),
];

const CHAT_OUTPUT_MESSAGES = [
  JSON.stringify({
    role: 'assistant',
    content:
      '```python\nimport torch.onnx\ndummy = tokenizer("sample text", return_tensors="pt",\n    padding="max_length", max_length=128).to(device)\ninp = (dummy["input_ids"], dummy["attention_mask"])\n\ntorch.onnx.export(\n    model, inp, "model.onnx",\n    input_names=["input_ids", "attention_mask"],\n    output_names=["last_hidden_state"],\n    dynamic_axes={"input_ids": {0: "batch"}},\n    opset_version=14,\n)\n```\n\n> Run `onnxruntime` validation after export: load the `.onnx` file and compare outputs against the PyTorch model on a sample batch to catch precision drift early.',
  }),
];

const TOOL_INPUT_MESSAGES = [
  JSON.stringify({
    role: 'user',
    content:
      'I hold 10 shares of AAPL, 5 shares of MSFT, and 20 shares of NVDA. What is my portfolio worth right now? Fetch live prices and show me a summary table.',
  }),
];

const TOOL_OUTPUT_MESSAGES = [
  JSON.stringify({
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_001',
        type: 'function',
        function: { name: 'get_stock_price', arguments: '{"symbol":"AAPL"}' },
      },
      {
        id: 'call_002',
        type: 'function',
        function: { name: 'get_stock_price', arguments: '{"symbol":"MSFT"}' },
      },
      {
        id: 'call_003',
        type: 'function',
        function: { name: 'get_stock_price', arguments: '{"symbol":"NVDA"}' },
      },
    ],
  }),
  JSON.stringify({
    role: 'tool',
    tool_call_id: 'call_001',
    content: '{"symbol":"AAPL","price":189.84,"change_pct":-0.42,"market_cap":"2.91T"}',
  }),
  JSON.stringify({
    role: 'tool',
    tool_call_id: 'call_002',
    content: '{"symbol":"MSFT","price":415.26,"change_pct":0.87,"market_cap":"3.09T"}',
  }),
  JSON.stringify({
    role: 'tool',
    tool_call_id: 'call_003',
    content: '{"symbol":"NVDA","price":875.40,"change_pct":2.13,"market_cap":"2.15T"}',
  }),
  JSON.stringify({
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_004',
        type: 'function',
        function: {
          name: 'calculate_portfolio_value',
          arguments:
            '{"holdings":[{"symbol":"AAPL","shares":10,"price":189.84},{"symbol":"MSFT","shares":5,"price":415.26},{"symbol":"NVDA","shares":20,"price":875.40}]}',
        },
      },
    ],
  }),
  JSON.stringify({
    role: 'tool',
    tool_call_id: 'call_004',
    content:
      '{"total_value":21482.70,"daily_change_pct":1.18,"breakdown":[{"symbol":"AAPL","value":1898.40,"weight":0.09},{"symbol":"MSFT","value":2076.30,"weight":0.10},{"symbol":"NVDA","value":17508.00,"weight":0.81}]}',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '| Stock | Shares | Price   | Value      | Change  |\n|-------|--------|---------|------------|---------|\n| AAPL  | 10     | $189.84 | $1,898.40  | -0.42%  |\n| MSFT  | 5      | $415.26 | $2,076.30  | +0.87%  |\n| NVDA  | 20     | $875.40 | $17,508.00 | +2.13%  |\n\n**Total portfolio value: $21,482.70** (daily change: +1.18%)',
  }),
];

const AGENT_PLAN_INPUT = [
  JSON.stringify({
    role: 'user',
    content:
      'Research the top 3 open-source vector databases by GitHub stars and write a comparison table.',
  }),
];

const AGENT_PLAN_OUTPUT = [
  JSON.stringify({
    role: 'assistant',
    content:
      '## Plan\n\n1. Use `search_github` → top repos by stars\n2. Use `fetch_readme` → extract language, license, highlights\n3. Use `rank_results` → sort by stars descending\n4. Use `build_table` → format comparison with stars, language, license, key highlights\n\n> Note: Results will be synthesized into a comparison table with stars, language, license, and key highlights.',
  }),
];

const AGENT_SEARCH_INPUT = [
  JSON.stringify({
    role: 'user',
    content: 'Search GitHub for: vector database open source, sort by stars',
  }),
];

const AGENT_SEARCH_OUTPUT = [
  JSON.stringify({
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_gh001',
        type: 'function',
        function: {
          name: 'search_github',
          arguments: '{"query":"vector database","sort":"stars","limit":10}',
        },
      },
    ],
  }),
  JSON.stringify({
    role: 'tool',
    tool_call_id: 'call_gh001',
    content:
      '[{"name":"milvus","stars":32000},{"name":"weaviate","stars":11000},{"name":"qdrant","stars":21000}]',
  }),
  JSON.stringify({ role: 'assistant', content: 'Found results. Proceeding to synthesis.' }),
];

const AGENT_SYNTHESIS_INPUT = [
  JSON.stringify({
    role: 'user',
    content:
      'Synthesize: milvus (32k stars), weaviate (11k stars), qdrant (21k stars). Write a comparison table.',
  }),
];

const AGENT_SYNTHESIS_OUTPUT = [
  JSON.stringify({
    role: 'assistant',
    content:
      'Here is a side-by-side comparison of the top 3 open-source vector databases by GitHub stars.\n\n| Database | Stars | Language | License | Highlights |\n|----------|-------|----------|---------|------------|\n| Milvus | 32k | Go/C++ | Apache 2 | Cloud-native, ANN search |\n| Qdrant | 21k | Rust | Apache 2 | Rust performance, filtering |\n| Weaviate | 11k | Go | BSD | GraphQL API, multi-modal |\n\n## Recommendation\n\n- **Milvus** is best for large-scale production deployments needing cloud-native infrastructure.\n- **Qdrant** is ideal for performance-critical workloads thanks to its Rust core and advanced filtering.\n- **Weaviate** suits teams wanting a GraphQL API and built-in multi-modal search support.\n\n> Star counts as of Q3 2024 — verify on GitHub before making architectural decisions.',
  }),
];

const RAG_EMBED_INPUT = [
  JSON.stringify({
    role: 'user',
    content: 'Encode for retrieval: "What are the side effects of ibuprofen with blood thinners?"',
  }),
];

const RAG_CHAT_INPUT = [
  JSON.stringify({
    role: 'system',
    content:
      'You are a database engineering assistant. Answer using only the provided context. Do not fabricate configuration values.',
  }),
  JSON.stringify({
    role: 'user',
    content:
      'What are the recommended settings for PgBouncer in transaction pooling mode for a high-traffic PostgreSQL app?\n\n[Context]\nPgBouncer is a lightweight connection pooler for PostgreSQL. In transaction pooling mode, a server connection is returned to the pool after each transaction. Recommended settings for high traffic: pool_mode=transaction, max_client_conn=1000, default_pool_size=20, min_pool_size=5, reserve_pool_size=5, reserve_pool_timeout=3. Setting server_idle_timeout=600 prevents stale connections. The auth_type should be scram-sha-256 for security. Avoid session pooling if you use advisory locks or SET statements that persist across transactions.',
  }),
];

const RAG_CHAT_OUTPUT = [
  JSON.stringify({
    role: 'assistant',
    content:
      '## Recommended PgBouncer Settings (Transaction Pooling)\n\n1. **pool_mode=transaction** — Returns server connections after each transaction.\n2. **max_client_conn=1000** — Allows 1,000 simultaneous client connections.\n3. **default_pool_size=20** — 20 server connections per database/user pair.\n4. **reserve_pool_size=5** — Emergency connections when the main pool is full.\n5. **server_idle_timeout=600** — Drops idle server connections after 10 minutes.\n\n```ini\n[pgbouncer]\npool_mode = transaction\nmax_client_conn = 1000\ndefault_pool_size = 20\nmin_pool_size = 5\nreserve_pool_size = 5\nserver_idle_timeout = 600\nauth_type = scram-sha-256\n```\n\n> **Warning:** Avoid advisory locks, `SET` statements, and persistent prepared statements — these are incompatible with transaction pooling and will behave unpredictably.',
  }),
];

const LONG_CONTENT = [
  JSON.stringify({
    role: 'system',
    content:
      'You are a helpful assistant. Analyze documents and extract structured information clearly.',
  }),
  JSON.stringify({
    role: 'user',
    content:
      'Review the sprint retrospective notes below and extract all action items, blockers, and commitments:\n\n--- SPRINT 23 RETRO ---\nTeam: Platform Engineering | Facilitator: Sarah\n\nWENT WELL:\nDeploy pipeline now under 8 min (was 22). Migration tooling praised by backend team. On-call rotation updated — incidents down 40%.\n\nNEEDS IMPROVEMENT:\nIntegration suite flaky (3 tests intermittent). PR review turnaround averages 3 days — blocking releases. No dashboards for the new payments service. Auth service runbooks out of date.\n\nACTION ITEMS:\nAlex: fix flaky tests by end of week. Marco: Grafana dashboard for payments (next sprint). Sarah: update auth runbook (Wednesday). Team: same-day review for hotfixes.\n\nBLOCKERS:\nAwaiting DevOps approval for prod DB access. Third-party API rate limits blocking load tests.\n--- END ---',
  }),
];

const LONG_OUTPUT = [
  JSON.stringify({
    role: 'assistant',
    content:
      '## Summary\nSprint 23 was a solid improvement sprint — deploy pipeline speed nearly tripled and on-call incidents dropped 40%. Test flakiness and slow PR reviews still create release friction.\n\n## Action Items\n- [ ] Alex: fix 3 flaky integration tests — end of week\n- [ ] Marco: Grafana dashboard for payments service — next sprint\n- [ ] Sarah: update auth service runbook — Wednesday\n- [ ] Team: same-day review policy for hotfixes — ongoing\n\n## Blockers\n- DevOps prod DB access approval pending (migration debugging)\n- Third-party API rate limits blocking load tests\n\n## Wins\n- Deploy pipeline: 22 min → under 8 min\n- Migration tooling praised by backend team\n- On-call rotation update cut incidents by 40%',
  }),
];

// ---------------------------------------------------------------------------
// Service 9: Real-world long conversation fixture
// Multi-turn developer assistant session — many short turns so the full
// conversation fits within ES keyword field limits.  Each assistant turn uses
// a different markdown element (code block, table, bullet list, blockquote)
// to exercise all rendering paths in the GenAI tab.
// ---------------------------------------------------------------------------

const REALWORLD_INPUT_MESSAGES = [
  JSON.stringify({
    role: 'system',
    content:
      'You are a senior TypeScript engineer. Write clean, well-typed, production-ready code. Use markdown in your answers.',
  }),
  JSON.stringify({
    role: 'user',
    content:
      "I'm building a Node.js REST API with Express and TypeScript. How should I handle errors globally?",
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      "Define a typed `AppError` class and funnel everything into one error middleware:\n\n```typescript\nexport class AppError extends Error {\n  constructor(\n    public statusCode: number,\n    message: string,\n    public code?: string\n  ) { super(message); }\n}\n\napp.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {\n  if (err instanceof AppError)\n    return res.status(err.statusCode).json({ code: err.code, message: err.message });\n  console.error(err);\n  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Unexpected error' });\n});\n```\n\n> Wrap async handlers with `asyncHandler` so thrown errors forward to `next` automatically.",
  }),
  JSON.stringify({
    role: 'user',
    content: 'Good. How do I validate request bodies before they reach the route handler?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      "Use **Zod** — it derives TypeScript types from schemas automatically:\n\n```typescript\nconst CreateUserSchema = z.object({\n  email: z.string().email(),\n  name:  z.string().min(1).max(100),\n  role:  z.enum(['admin', 'editor', 'viewer']).default('viewer'),\n});\ntype CreateUserInput = z.infer<typeof CreateUserSchema>;\n\nconst validate = (schema: AnyZodObject) =>\n  async (req: Request, _res: Response, next: NextFunction) => {\n    const result = await schema.safeParseAsync(req.body);\n    if (!result.success)\n      return next(new AppError(400, result.error.issues.map(i => i.message).join('; '), 'VALIDATION_ERROR'));\n    req.body = result.data;\n    next();\n  };\n```\n\n> **Edge case:** Use `safeParseAsync` when any refinement is async (e.g. uniqueness DB check).",
  }),
  JSON.stringify({
    role: 'user',
    content: 'Should I use JWT or server-side sessions for authentication?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '## JWT vs Sessions\n\n| | JWT | Sessions |\n|---|---|---|\n| **State** | Stateless | Stateful (Redis / DB) |\n| **Revocation** | Hard — needs a blocklist | Easy — delete the row |\n| **Scale** | Works across nodes | Needs shared store |\n| **Token size** | ~500 bytes | ~50 bytes (cookie) |\n\n**Rule of thumb:** JWT for stateless microservices; sessions when you need instant "log out everywhere".\n\n```typescript\nconst requireAuth = (req: Request, _res: Response, next: NextFunction) => {\n  const token = req.headers.authorization?.split(" ")[1];\n  if (!token) throw new AppError(401, "Missing token", "UNAUTHORIZED");\n  req.user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;\n  next();\n};\n```',
  }),
  JSON.stringify({
    role: 'user',
    content: 'How do I write integration tests for the routes with Jest and supertest?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      "```typescript\nimport request from 'supertest';\nimport { app } from '../src/app'; // exported WITHOUT .listen()\n\ndescribe('POST /users', () => {\n  it('201 on valid input', async () => {\n    const res = await request(app)\n      .post('/users')\n      .send({ email: 'alice@example.com', name: 'Alice' });\n    expect(res.status).toBe(201);\n    expect(res.body.data.email).toBe('alice@example.com');\n  });\n\n  it('400 on invalid email', async () => {\n    const res = await request(app).post('/users').send({ name: 'Alice' });\n    expect(res.status).toBe(400);\n    expect(res.body.code).toBe('VALIDATION_ERROR');\n  });\n});\n```\n\n**Patterns:**\n- Export `app` without `listen()` — supertest binds its own socket.\n- Set `clearMocks: true` in jest config to reset spies automatically.\n- Seed in `beforeAll`, truncate tables in `afterEach` for full isolation.",
  }),
  JSON.stringify({
    role: 'user',
    content: 'How do I add rate limiting to protect the API?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      "Use `express-rate-limit` for a zero-config solution:\n\n```typescript\nimport rateLimit from 'express-rate-limit';\n\nconst limiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 min\n  max: 100,                  // per IP\n  standardHeaders: true,\n  legacyHeaders: false,\n  handler: (_req, res) =>\n    res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many requests' }),\n});\n\napp.use('/api/', limiter);\n```\n\nFor distributed deployments, swap the in-memory store for a **Redis** store via `rate-limit-redis` so limits are shared across all pods.\n\n> **Tip:** Apply a stricter limiter on auth routes (`POST /login`, `POST /register`) — e.g. 5 requests / 15 min — to slow brute-force attacks.",
  }),
  JSON.stringify({
    role: 'user',
    content: 'What logging setup would you recommend?',
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      "**Use `pino`** — it logs structured JSON at near-zero overhead:\n\n```typescript\nimport pino from 'pino';\nexport const logger = pino({\n  level: process.env.LOG_LEVEL ?? 'info',\n  transport: process.env.NODE_ENV !== 'production'\n    ? { target: 'pino-pretty' }   // human-readable in dev\n    : undefined,                    // raw JSON in prod (for log aggregators)\n});\n\n// Request logging middleware\napp.use((req, _res, next) => {\n  req.log = logger.child({ requestId: req.headers['x-request-id'] });\n  req.log.info({ method: req.method, path: req.path }, 'incoming request');\n  next();\n});\n```\n\n**Log levels by severity:**\n- `trace` / `debug` — local dev only\n- `info` — lifecycle events (server start, graceful shutdown)\n- `warn` — recoverable issues (deprecated API used)\n- `error` — unhandled exceptions forwarded to the error middleware",
  }),
  JSON.stringify({
    role: 'user',
    content: 'Last one: how do I containerize this and set up health checks for Kubernetes?',
  }),
];

const REALWORLD_OUTPUT_MESSAGES = [
  // NOTE: keep each serialized message under 1024 chars — the ES `attributes`
  // flattened mapping uses ignore_above:1024 and silently drops longer values
  // from the index (they stay in _source but the fields API can't see them).
  JSON.stringify({
    role: 'assistant',
    content:
      "## Multi-stage Dockerfile\n\n```dockerfile\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine\nENV NODE_ENV=production\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY --from=builder /app/dist ./dist\nUSER node\nCMD [\"node\", \"dist/server.js\"]\n```\n\n> Multi-stage cuts the final image from ~600 MB to ~80 MB by excluding devDependencies and source.\n\n## Health routes\n\n```typescript\nrouter.get('/healthz', (_, res) => res.json({ ok: true }));\nrouter.get('/readyz', async (_, res) => {\n  await db.raw('SELECT 1');\n  res.json({ ok: true });\n});\n```",
  }),
  JSON.stringify({
    role: 'assistant',
    content:
      '## Kubernetes probes\n\n```yaml\nlivenessProbe:\n  httpGet: { path: /healthz, port: 3000 }\n  periodSeconds: 10\nreadinessProbe:\n  httpGet: { path: /readyz, port: 3000 }\n  periodSeconds: 5\n```\n\n| Probe | Fails → | Action |\n|---|---|---|\n| **liveness** | process hung | pod restarted |\n| **readiness** | DB unreachable | removed from Service, no restart |\n\n> **Gotcha:** Never put the DB check in `livenessProbe`. If the DB goes down Kubernetes will restart-loop every pod — making the outage worse. Keep liveness cheap; move deep checks to readiness.',
  }),
];

// ---------------------------------------------------------------------------
// Service 10: At-the-limit message fixture
// Every message is padded so its serialized JSON is exactly 1024 chars — the
// largest value the ES flattened `attributes` mapping (ignore_above:1024)
// will still index. Anything longer is silently dropped from the index and
// disappears from the fields API (and therefore from the GenAI tab).
// ---------------------------------------------------------------------------

const ES_FLATTENED_IGNORE_ABOVE = 1024;

// Pads the message content with plain-ASCII filler (1 raw char == 1 serialized
// char) so that JSON.stringify(message) lands exactly on the target length.
function messagePaddedTo(targetLength: number, role: string, content: string): string {
  const FILLER =
    ' The quick brown fox jumps over the lazy dog while the pipeline keeps streaming tokens without dropping a single frame.';
  const room = targetLength - JSON.stringify({ role, content }).length;
  if (room <= 0) {
    return JSON.stringify({ role, content });
  }
  const padding = FILLER.repeat(Math.ceil(room / FILLER.length)).slice(0, room);
  return JSON.stringify({ role, content: content + padding });
}

// The longest possible message that still gets indexed and shows up in the UI.
function messageAtEsLimit(role: string, content: string): string {
  return messagePaddedTo(ES_FLATTENED_IGNORE_ABOVE, role, content);
}

const MAXLEN_INPUT_MESSAGES = [
  messageAtEsLimit(
    'system',
    'You are an expert ML engineer specializing in Python and HuggingFace Transformers. Provide detailed, thorough answers with complete code examples, full explanations of every parameter, and exhaustive coverage of edge cases. Never abbreviate. Always spell out the reasoning behind each recommendation so the reader understands not just what to do but why it is the right approach for production workloads.'
  ),
  messageAtEsLimit(
    'user',
    'I need to fine-tune a BERT model for multi-label document classification on a dataset of about 200k legal contracts. Each document can have up to 14 overlapping labels. What is the complete recommended setup — model choice, loss function, tokenization strategy for long documents, and training configuration? Please be as detailed as possible because this will run in production.'
  ),
  messageAtEsLimit(
    'assistant',
    "For multi-label classification you need sigmoid outputs with binary cross-entropy, not softmax:\n\n```python\nfrom transformers import AutoModelForSequenceClassification\n\nmodel = AutoModelForSequenceClassification.from_pretrained(\n    'bert-base-uncased',\n    num_labels=14,\n    problem_type='multi_label_classification',\n)\n```\n\nSetting `problem_type` makes the Trainer use `BCEWithLogitsLoss` automatically. For 200k legal contracts, prefer `nlpaueb/legal-bert-base-uncased` — domain pre-training is worth 2-4 F1 points on contract corpora."
  ),
  messageAtEsLimit(
    'user',
    'Legal contracts are much longer than 512 tokens though — most of ours are 5 to 30 pages. How do I handle documents that exceed the maximum sequence length without losing the clauses at the end, which are often the most legally significant part of the contract?'
  ),
  messageAtEsLimit(
    'assistant',
    'Three strategies, in order of implementation effort:\n\n1. **Sliding window**: split each document into overlapping 512-token chunks (stride 128), classify each chunk, max-pool the per-label logits across chunks.\n2. **Head + tail truncation**: keep the first 128 and last 382 tokens — surprisingly strong for contracts because signatures and riders sit at the end.\n3. **Longformer**: swap to `allenai/longformer-base-4096` and fit most contracts whole.\n\n| Strategy | Max length | Compute | F1 delta |\n|---|---|---|---|\n| Sliding window | unlimited | 3-8x | baseline |\n| Head+tail | 512 | 1x | -1.5 |\n| Longformer | 4096 | 2x | +0.8 |'
  ),
  messageAtEsLimit(
    'user',
    'What threshold strategy should I use at inference time for the 14 labels, given that the label distribution is heavily imbalanced — some labels appear in 40 percent of contracts while others appear in fewer than 2 percent?'
  ),
];

const MAXLEN_OUTPUT_MESSAGES = [
  messageAtEsLimit(
    'assistant',
    'Never use a global 0.5 threshold with that imbalance. Tune one threshold per label on a validation split:\n\n```python\nimport numpy as np\nfrom sklearn.metrics import precision_recall_curve\n\ndef tune_thresholds(y_true, y_prob):\n    thresholds = np.zeros(y_true.shape[1])\n    for i in range(y_true.shape[1]):\n        p, r, t = precision_recall_curve(y_true[:, i], y_prob[:, i])\n        f1 = 2 * p * r / (p + r + 1e-9)\n        thresholds[i] = t[np.argmax(f1[:-1])]\n    return thresholds\n```\n\n> For the sub-2% labels, also oversample positives during training or weight the positive class in the loss — threshold tuning alone cannot recover a label the model never learned.'
  ),
];

// ---------------------------------------------------------------------------
// Service 11: Over-the-limit message fixture
// A realistic incident investigation conversation — system prompt with full
// SRE context, a user message containing structured logs, Kubernetes metrics,
// and deployment history, and an assistant RCA with Go code blocks and an
// action-items table. Every message serializes to well over 1024 chars so ES
// drops them from the index at ingest (doc carries `_ignored`). Only the
// metadata route's read-time _source fallback can surface them in the UI.
// ---------------------------------------------------------------------------

const OVERLIMIT_INPUT_MESSAGES = [
  JSON.stringify({
    role: 'system',
    content:
      'You are an expert SRE and distributed-systems engineer specializing in production incident investigation and root cause analysis. You have deep expertise in Go, Kubernetes, Redis, and Prometheus-based observability stacks.\n\nEnvironment:\n- Kubernetes on AWS EKS, 3 AZs (us-east-1a/b/c)\n- Services: event-processor (Go 1.22), api-gateway (Node.js 20), cache-service (Redis 7.2 Cluster)\n- Observability: Prometheus + Grafana, Jaeger distributed tracing, Elasticsearch for structured logs\n- SLOs: event-processor p99 latency < 200ms, error rate < 0.1%, availability > 99.9%\n- On-call escalation: SEV-3 → team lead; SEV-2 → engineering manager; SEV-1 → VP Engineering\n\nInvestigation methodology:\n1. Establish blast radius — which services, regions, and customers are impacted\n2. Anchor the timeline — when metrics first deviated from baseline\n3. Correlate with change events — deployments, config changes, traffic spikes, upstream incidents\n4. Form ranked hypotheses — list top 3-5 candidates with supporting and contradicting evidence\n5. Recommend immediate mitigation before proposing the permanent fix\n6. Deliver a structured post-incident RCA: root cause, contributing factors, detection gaps, remediation steps, and action items with owners and deadlines\n\nAlways distinguish between the immediate fix (stop the bleeding) and the root-cause fix (prevent recurrence). Never recommend a workaround without identifying the underlying cause.',
  }),
  JSON.stringify({
    role: 'user',
    content:
      'SEV-2 in production — event-processor service is degraded.\n\n**Impact**\n- event-processor p99 latency: 8,400 ms (SLO: 200 ms)\n- event-processor error rate: 4.7% (baseline: 0.02%)\n- api-gateway: 12% of POST /api/v2/events/batch requests timing out\n- Affected: us-east-1 region (us-east-2 healthy)\n- Started: ~40 minutes ago at 14:05 UTC\n\n**Logs — event-processor (last 5 min, pod event-processor-7d4f9b-xk2p9)**\n```\n2024-11-15T14:32:01Z ERROR msg="batch processing failed"\n  trace_id=a3f2b1c4d5e6f7a8 batch_size=2500 processing_time_ms=29847\n  goroutine_count=8421 heap_alloc_mb=2847 next_gc_mb=2048\n  error="context deadline exceeded"\n\n2024-11-15T14:32:01Z WARN  msg="GC pressure detected"\n  gc_pause_ms=847 gc_cycles_last_minute=94\n\n2024-11-15T14:32:02Z ERROR msg="downstream call failed" service=cache-service\n  error="connection pool exhausted: max_connections=50 active=50 waiting=234"\n  latency_ms=15000\n\n2024-11-15T14:32:03Z ERROR msg="batch processing failed"\n  trace_id=b4e3c2d1e0f9a8b7 batch_size=2500 processing_time_ms=30001\n  goroutine_count=8847 heap_alloc_mb=3012 next_gc_mb=2048\n  error="context deadline exceeded"\n```\n\n**Kubernetes resource usage**\n```\nNAME                              CPU    MEMORY\nevent-processor-7d4f9b-xk2p9     3920m  2.9Gi/3Gi (97%)\nevent-processor-7d4f9b-m8r3k     3880m  2.8Gi/3Gi (93%)\nevent-processor-7d4f9b-p9n4j     3750m  2.7Gi/3Gi (90%)\n```\n\n**Recent deployments (last 8 hours)**\n```\n14:05 UTC  event-processor  v2.14.3 → v2.15.0  "feat: parallel batch processing"\n11:30 UTC  cache-service    v1.8.1              "chore: routine dependency updates"\n09:15 UTC  api-gateway      v3.22.0             "fix: increase request timeout to 30s"\n```\n\nThe deployment at 14:05 UTC coincides exactly with the incident onset. What is your hypothesis and what should we do immediately?',
  }),
];

const OVERLIMIT_OUTPUT_MESSAGES = [
  JSON.stringify({
    role: 'assistant',
    content:
      '## Immediate Action — Roll Back Now\n\n```bash\nkubectl rollout undo deployment/event-processor -n production\nkubectl rollout status deployment/event-processor -n production --timeout=120s\n```\n\nWatch goroutine_count and heap_alloc_mb drop within 2 minutes. If memory does not recover, force a pod restart:\n\n```bash\nkubectl rollout restart deployment/event-processor -n production\n```\n\n---\n\n## Root Cause Analysis\n\n### Root Cause\n\nThe v2.15.0 "parallel batch processing" feature introduced **unbounded goroutine concurrency**. Processing a batch of 2,500 events spawned one goroutine per sub-batch with no concurrency cap. Each goroutine acquired a Redis connection, exhausting the pool (max=50) within seconds. With 234 goroutines queued on connections and GC pausing for 847 ms, batches could not complete within the 30-second deadline.\n\n### Evidence Chain\n\n1. **Goroutine explosion**: count jumped from ~200 baseline to 8,421–8,847 (42×). Each goroutine holds stack memory and a Redis connection slot.\n2. **Heap pressure**: heap_alloc_mb at 2.8–3.0 Gi against 3 Gi container limit; GC at 94 cycles/minute with 847 ms stop-the-world pauses blocking all goroutines intermittently.\n3. **Connection pool exhaustion**: all 50 Redis connections active, 234 goroutines waiting — cache calls took 15,000 ms instead of the expected sub-5 ms.\n4. **Cascading timeout**: processing timeout (30 s) fires before the Redis backlog clears → context deadline exceeded errors propagate upstream → api-gateway 30 s client timeout fires → 12% of batch requests fail.\n5. **Change correlation**: incident onset at 14:05 UTC matches deployment timestamp exactly.\n\n### Likely Bug Pattern\n\nThe anti-pattern (what v2.15.0 shipped):\n\n```go\nfunc processBatch(ctx context.Context, events []Event) error {\n    var wg sync.WaitGroup\n    for _, chunk := range splitBatch(events, chunkSize) {\n        wg.Add(1)\n        go func(c []Event) { // unbounded — one goroutine per chunk, no cap\n            defer wg.Done()\n            processChunk(ctx, c) // each goroutine holds a Redis connection\n        }(chunk)\n    }\n    wg.Wait()\n    return nil\n}\n```\n\nThe fix — bound concurrency with a semaphore channel:\n\n```go\nconst maxConcurrency = 8 // tune to Redis pool size\n\nfunc processBatch(ctx context.Context, events []Event) error {\n    sem := make(chan struct{}, maxConcurrency)\n    var wg sync.WaitGroup\n    var firstErr atomic.Value\n    for _, chunk := range splitBatch(events, chunkSize) {\n        sem <- struct{}{}\n        wg.Add(1)\n        go func(c []Event) {\n            defer wg.Done()\n            defer func() { <-sem }()\n            if err := processChunk(ctx, c); err != nil {\n                firstErr.CompareAndSwap(nil, err)\n            }\n        }(chunk)\n    }\n    wg.Wait()\n    if err, _ := firstErr.Load().(error); err != nil {\n        return err\n    }\n    return nil\n}\n```\n\n### Contributing Factors\n\n- Redis pool sized for sequential workloads (50); parallel processing requires pool_size >= maxConcurrency.\n- No canary rollout policy — the deploy went 0% → 100% instantly with no traffic shadowing.\n- Load tests only covered batch_size <= 100; production batches reach 2,500.\n- No goroutine-count or connection-pool-utilization alerts — the spike went undetected for 40 minutes.\n\n### Action Items\n\n| # | Action | Owner | Deadline |\n|---|--------|-------|----------|\n| 1 | Add semaphore (maxConcurrency=8) to parallel batch processor | Backend | Before re-deploy |\n| 2 | Raise Redis connection pool to 2x maxConcurrency | SRE | Before re-deploy |\n| 3 | Alert on goroutine_count > 1000 and redis_pool_utilization > 80% | Observability | This sprint |\n| 4 | Extend load tests to cover batch_size up to 5,000 | QA | This sprint |\n| 5 | Enforce canary rollout for event-processor (10% for 15 min before full) | Platform | This sprint |\n| 6 | Add integration test asserting goroutine_count < 500 under max-batch load | Backend | Next sprint |',
  }),
];

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const scenario: Scenario<ApmOtelFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      // =================================================================
      // Service 1: Multi-turn chat — OpenAI gpt-4o
      // ROOT SERVER span carries gen_ai.* → GenAI tab visible immediately
      // in the TRANSACTION flyout.
      // =================================================================
      const chatInstance = apm
        .otelService({
          name: 'genai-chat-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('chat-instance-1');

      const chatSpans = range
        .interval('5s')
        .rate(1)
        .generator((timestamp) =>
          chatInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 2800,
              'attributes.gen_ai.usage.output_tokens': 950,
              'attributes.gen_ai.request.temperature': 0.7,
              'attributes.gen_ai.request.top_p': 1,
              'attributes.gen_ai.request.max_tokens': 2048,
              'attributes.gen_ai.request.seed': 42,
              'attributes.gen_ai.response.id': 'chatcmpl-abc123',
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': CHAT_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': CHAT_OUTPUT_MESSAGES,
              'attributes.gen_ai.system_instructions':
                'You are an expert software engineer. Be concise and precise in your answers.',
              'attributes.gen_ai.conversation.id': 'conv-chat-001',
            })
            .timestamp(timestamp)
            .duration(2340)
            .success()
        );

      // =================================================================
      // Service 2: Tool / function calling — Anthropic claude-3-5-sonnet
      // Exercises the structured parts schema (tool_calls + tool results).
      // =================================================================
      const toolInstance = apm
        .otelService({
          name: 'genai-tool-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('tool-instance-1');

      const toolSpans = range
        .interval('8s')
        .rate(1)
        .generator((timestamp) =>
          toolInstance
            .span({ name: 'POST /v1/messages', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/messages',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'anthropic',
              'attributes.gen_ai.provider.name': 'anthropic',
              'attributes.gen_ai.request.model': 'claude-3-5-sonnet-20241022',
              'attributes.gen_ai.usage.input_tokens': 95,
              'attributes.gen_ai.usage.output_tokens': 62,
              'attributes.gen_ai.request.max_tokens': 1024,
              'attributes.gen_ai.request.temperature': 0.5,
              'attributes.gen_ai.request.top_k': 40,
              'attributes.gen_ai.request.seed': 7,
              'attributes.gen_ai.response.finish_reasons': ['tool_use'],
              'attributes.gen_ai.input.messages': TOOL_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': TOOL_OUTPUT_MESSAGES,
              'attributes.gen_ai.conversation.id': 'conv-tool-001',
            })
            .timestamp(timestamp)
            .duration(1450)
            .success()
        );

      // =================================================================
      // Service 3: Text embeddings — OpenAI text-embedding-3-small
      // Exercises gen_ai.operation.name = 'embeddings' (no conversation).
      // =================================================================
      const embedInstance = apm
        .otelService({
          name: 'genai-embed-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('embed-instance-1');

      const embedSpans = range
        .interval('3s')
        .rate(1)
        .generator((timestamp) =>
          embedInstance
            .span({ name: 'POST /v1/embeddings', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/embeddings',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'embeddings',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'text-embedding-3-small',
              'attributes.gen_ai.response.model': 'text-embedding-3-small',
              'attributes.gen_ai.usage.input_tokens': 42,
              'attributes.gen_ai.usage.output_tokens': 0,
              'attributes.gen_ai.input.messages': RAG_EMBED_INPUT,
            })
            .timestamp(timestamp)
            .duration(180)
            .success()
        );

      // =================================================================
      // Service 4: Minimal fields — Amazon Bedrock titan-text-express
      // Only required gen_ai fields. Verifies optional sections stay hidden.
      // =================================================================
      const minimalInstance = apm
        .otelService({
          name: 'genai-minimal-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'java',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('minimal-instance-1');

      const minimalSpans = range
        .interval('10s')
        .rate(1)
        .generator((timestamp) =>
          minimalInstance
            .span({ name: 'POST /model/invoke', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/model/invoke',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'aws.bedrock',
              'attributes.gen_ai.request.model': 'amazon.titan-text-express-v1',
              'attributes.gen_ai.usage.input_tokens': 55,
              'attributes.gen_ai.usage.output_tokens': 38,
            })
            .timestamp(timestamp)
            .duration(890)
            .success()
        );

      // =================================================================
      // Service 5: Long content — tests the View more toggle.
      // =================================================================
      const longInstance = apm
        .otelService({
          name: 'genai-long-content-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('long-instance-1');

      const longSpans = range
        .interval('15s')
        .rate(1)
        .generator((timestamp) =>
          longInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o-mini',
              'attributes.gen_ai.response.model': 'gpt-4o-mini-2024-07-18',
              'attributes.gen_ai.usage.input_tokens': 1840,
              'attributes.gen_ai.usage.output_tokens': 512,
              'attributes.gen_ai.request.max_tokens': 4096,
              'attributes.gen_ai.request.temperature': 0.3,
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': LONG_CONTENT,
              'attributes.gen_ai.output.messages': LONG_OUTPUT,
            })
            .timestamp(timestamp)
            .duration(5200)
            .success()
        );

      // =================================================================
      // Service 6: Agentic flow — SERVER transaction wrapping 3 CLIENT
      // genAI exit spans (plan → search → synthesize). The SERVER transaction
      // also carries gen_ai.* so the GenAI tab is visible in BOTH the
      // transaction flyout AND each individual span flyout.
      // =================================================================
      const agentInstance = apm
        .otelService({
          name: 'genai-agent-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('agent-instance-1');

      const agentSpans = range
        .interval('12s')
        .rate(1)
        .generator((timestamp) => {
          const tx = agentInstance
            .span({ name: 'POST /v1/agent/run', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/agent/run',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.usage.input_tokens': 1100,
              'attributes.gen_ai.usage.output_tokens': 420,
              'attributes.gen_ai.conversation.id': 'conv-agent-001',
            })
            .timestamp(timestamp)
            .duration(4500)
            .success();

          // Step 1: planning (Anthropic for diversity)
          const planSpan = agentInstance
            .genAiExitSpan({ name: 'plan claude-3-5-sonnet', system: 'anthropic' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'anthropic',
              'attributes.gen_ai.request.model': 'claude-3-5-sonnet-20241022',
              'attributes.gen_ai.response.model': 'claude-3-5-sonnet-20241022',
              'attributes.gen_ai.usage.input_tokens': 340,
              'attributes.gen_ai.usage.output_tokens': 180,
              'attributes.gen_ai.request.temperature': 0.4,
              'attributes.gen_ai.request.max_tokens': 2048,
              'attributes.gen_ai.response.finish_reasons': ['end_turn'],
              'attributes.gen_ai.input.messages': AGENT_PLAN_INPUT,
              'attributes.gen_ai.output.messages': AGENT_PLAN_OUTPUT,
            })
            .timestamp(timestamp)
            .duration(900)
            .success();

          // Step 2: tool-assisted search
          const searchSpan = agentInstance
            .genAiExitSpan({ name: 'search gpt-4o', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 410,
              'attributes.gen_ai.usage.output_tokens': 155,
              'attributes.gen_ai.request.temperature': 0.0,
              'attributes.gen_ai.request.max_tokens': 1024,
              'attributes.gen_ai.response.finish_reasons': ['tool_calls'],
              'attributes.gen_ai.input.messages': AGENT_SEARCH_INPUT,
              'attributes.gen_ai.output.messages': AGENT_SEARCH_OUTPUT,
            })
            .timestamp(timestamp + 900)
            .duration(1800)
            .success();

          // Step 3: synthesis
          const synthSpan = agentInstance
            .genAiExitSpan({ name: 'synthesize gpt-4o', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 350,
              'attributes.gen_ai.usage.output_tokens': 85,
              'attributes.gen_ai.request.temperature': 0.6,
              'attributes.gen_ai.request.max_tokens': 512,
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': AGENT_SYNTHESIS_INPUT,
              'attributes.gen_ai.output.messages': AGENT_SYNTHESIS_OUTPUT,
            })
            .timestamp(timestamp + 2700)
            .duration(500)
            .success();

          return tx.children(planSpan, searchSpan, synthSpan);
        });

      // =================================================================
      // Service 7: RAG pipeline — SERVER root + embeddings CLIENT span +
      // chat CLIENT span. Covers both operation types in one trace.
      // =================================================================
      const ragInstance = apm
        .otelService({
          name: 'genai-rag-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('rag-instance-1');

      const ragSpans = range
        .interval('7s')
        .rate(1)
        .generator((timestamp) => {
          const tx = ragInstance
            .span({ name: 'POST /v1/rag/answer', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/rag/answer',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.usage.input_tokens': 680,
              'attributes.gen_ai.usage.output_tokens': 240,
            })
            .timestamp(timestamp)
            .duration(1200)
            .success();

          const embedSpan = ragInstance
            .genAiExitSpan({ name: 'embed text-embedding-3-small', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'embeddings',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'text-embedding-3-small',
              'attributes.gen_ai.response.model': 'text-embedding-3-small',
              'attributes.gen_ai.usage.input_tokens': 42,
              'attributes.gen_ai.usage.output_tokens': 0,
              'attributes.gen_ai.input.messages': RAG_EMBED_INPUT,
            })
            .timestamp(timestamp)
            .duration(180)
            .success();

          const chatSpan = ragInstance
            .genAiExitSpan({ name: 'chat gpt-4o', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 638,
              'attributes.gen_ai.usage.output_tokens': 240,
              'attributes.gen_ai.request.temperature': 0.1,
              'attributes.gen_ai.request.max_tokens': 1024,
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': RAG_CHAT_INPUT,
              'attributes.gen_ai.output.messages': RAG_CHAT_OUTPUT,
              'attributes.gen_ai.system_instructions':
                'You are a database engineering assistant. Answer using only the provided context. Do not fabricate configuration values.',
            })
            .timestamp(timestamp + 180)
            .duration(1000)
            .success();

          return tx.children(embedSpan, chatSpan);
        });

      // =================================================================
      // Service 9: Real-world long conversation — multi-turn developer
      // assistant session with mixed markdown, code blocks, and prose.
      // Tests rendering fidelity: headers, numbered lists, tables,
      // inline code, fenced blocks (TypeScript / bash / dockerfile / yaml),
      // and the View more toggle on long messages.
      // =================================================================
      const realworldInstance = apm
        .otelService({
          name: 'genai-realworld-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('realworld-instance-1');

      const realworldSpans = range
        .interval('20s')
        .rate(1)
        .generator((timestamp) =>
          realworldInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 2100,
              'attributes.gen_ai.usage.output_tokens': 820,
              'attributes.gen_ai.request.temperature': 0.2,
              'attributes.gen_ai.request.top_p': 0.95,
              'attributes.gen_ai.request.max_tokens': 4096,
              'attributes.gen_ai.request.seed': 42,
              'attributes.gen_ai.response.id': 'chatcmpl-realworld-001',
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.conversation.id': 'conv-realworld-001',
              'attributes.gen_ai.system_instructions':
                'You are a senior software engineer. You write clean, well-typed, production-ready code.',
              'attributes.gen_ai.input.messages': REALWORLD_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': REALWORLD_OUTPUT_MESSAGES,
            })
            .timestamp(timestamp)
            .duration(8700)
            .success()
        );

      // =================================================================
      // Service 10: At-the-limit content — every message's serialized JSON
      // is exactly 1024 chars, the largest value ES will still index for
      // the flattened `attributes` mapping (ignore_above:1024). Verifies
      // the UI renders content sitting right on the boundary.
      // =================================================================
      const maxlenInstance = apm
        .otelService({
          name: 'genai-maxlen-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('maxlen-instance-1');

      const maxlenSpans = range
        .interval('9s')
        .rate(1)
        .generator((timestamp) =>
          maxlenInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 5100,
              'attributes.gen_ai.usage.output_tokens': 1010,
              'attributes.gen_ai.request.temperature': 0.7,
              'attributes.gen_ai.request.max_tokens': 4096,
              'attributes.gen_ai.response.id': 'chatcmpl-maxlen-001',
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.conversation.id': 'conv-maxlen-001',
              'attributes.gen_ai.input.messages': MAXLEN_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': MAXLEN_OUTPUT_MESSAGES,
            })
            .timestamp(timestamp)
            .duration(6100)
            .success()
        );

      // =================================================================
      // Service 11: Over-limit content — messages exceed ignore_above:1024
      // so ES drops them from the index (doc carries `_ignored`). Only the
      // metadata route's _source fallback can surface them in the UI.
      // =================================================================
      const overlimitInstance = apm
        .otelService({
          name: 'genai-overlimit-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('overlimit-instance-1');

      const overlimitSpans = range
        .interval('11s')
        .rate(1)
        .generator((timestamp) =>
          overlimitInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 8200,
              'attributes.gen_ai.usage.output_tokens': 2400,
              'attributes.gen_ai.request.temperature': 0.4,
              'attributes.gen_ai.request.max_tokens': 8192,
              'attributes.gen_ai.response.id': 'chatcmpl-overlimit-001',
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.conversation.id': 'conv-overlimit-001',
              'attributes.gen_ai.input.messages': OVERLIMIT_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': OVERLIMIT_OUTPUT_MESSAGES,
            })
            .timestamp(timestamp)
            .duration(12400)
            .success()
        );

      // =================================================================
      // Service 8: Non-GenAI HTTP service — GenAI tab must NOT appear.
      // =================================================================
      const regularInstance = apm
        .otelService({
          name: 'regular-http-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'go',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('regular-instance-1');

      const regularSpans = range
        .interval('2s')
        .rate(1)
        .generator((timestamp) =>
          regularInstance
            .span({ name: 'GET /api/users', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'GET',
              'attributes.url.path': '/api/users',
              'attributes.server.address': 'regular-http-service',
            })
            .timestamp(timestamp)
            .duration(45)
            .success()
        );

      return [
        withClient(apmEsClient, [
          chatSpans,
          toolSpans,
          embedSpans,
          minimalSpans,
          longSpans,
          agentSpans,
          ragSpans,
          realworldSpans,
          maxlenSpans,
          overlimitSpans,
          regularSpans,
        ]),
      ];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
